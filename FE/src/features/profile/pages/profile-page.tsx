import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, apiBaseUrl } from "@/shared/api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { setStoredAuthUser } from "@/features/auth/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Upload, Loader2 } from "lucide-react";

const GENDER_OPTIONS = [
  { value: "", label: "— Chọn —" },
  { value: "Nam", label: "Nam" },
  { value: "Nữ", label: "Nữ" },
  { value: "Khác", label: "Khác" },
];

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", authUser?.id],
    queryFn: getProfile,
    enabled: !!authUser,
  });

  const [form, setForm] = useState({
    age: "" as string | number,
    gender: "",
    joinDate: "",
    position: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        age: profile.age ?? "",
        gender: profile.gender ?? "",
        joinDate: profile.joinDate ?? "",
        position: profile.position ?? "",
      });
    }
  }, [profile?.id, profile?.age, profile?.gender, profile?.joinDate, profile?.position]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProfile(
        {
          age: form.age === "" ? null : Number(form.age),
          gender: form.gender || null,
          joinDate: form.joinDate || null,
          position: form.position || null,
        },
        avatarFile ?? undefined
      ),
    onSuccess: (updated) => {
      setStoredAuthUser(updated);
      queryClient.setQueryData(["profile", authUser?.id], updated);
      setAvatarVersion((v) => v + 1);
      localStorage.setItem("taskmate_avatar_ts", String(Date.now()));
      window.dispatchEvent(new CustomEvent("taskmate-auth-update"));
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const baseAvatarUrl = profile?.avatar
    ? profile.avatar.startsWith("http")
      ? profile.avatar
      : `${apiBaseUrl}${profile.avatar}`
    : null;
  const avatarUrl = baseAvatarUrl
    ? `${baseAvatarUrl}${baseAvatarUrl.includes("?") ? "&" : "?"}v=${avatarVersion}`
    : null;
  const previewUrl = avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl;

  if (!authUser) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Vui lòng đăng nhập để xem profile.
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Hồ sơ cá nhân
          </CardTitle>
          <CardDescription>Quản lý thông tin và avatar của bạn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="size-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Avatar" className="size-full object-cover" />
                  ) : (
                    <User className="size-12 text-muted-foreground" />
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4 mr-1" />
                {avatarFile ? "Đổi ảnh" : "Tải ảnh lên"}
              </Button>
              {avatarFile && (
                <span className="text-xs text-muted-foreground">{avatarFile.name}</span>
              )}
            </div>
            <div className="flex-1 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="profile-age">Độ tuổi</Label>
                <Input
                  id="profile-age"
                  type="number"
                  min={1}
                  max={120}
                  placeholder="Ví dụ: 28"
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-gender">Giới tính</Label>
                <select
                  id="profile-gender"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="profile-joinDate">Ngày vào làm</Label>
                <Input
                  id="profile-joinDate"
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="profile-position">Chức vụ</Label>
                <Input
                  id="profile-position"
                  type="text"
                  placeholder="Ví dụ: Developer, PM, Designer"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Đang lưu...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
            {updateMutation.isError && (
              <span className="text-sm text-destructive self-center">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : "Lỗi khi lưu"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
