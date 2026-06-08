import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/shared/api";
import { resolveAvatarUrl } from "@/shared/lib/avatar-url";
import { compressAvatarFile } from "@/shared/lib/compress-avatar";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { setStoredAuthUser } from "@/features/auth/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Upload, Loader2 } from "lucide-react";
import { DEFAULT_SMTP_HOST, DEFAULT_WEBMAIL_URL } from "@/shared/types";
import {
  calcAgeFromDateOfBirth,
  getProfileAgeError,
  getProfileDateOfBirthBounds,
} from "@/shared/lib/birthday";

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

  const [webmailPassword, setWebmailPassword] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    joinDate: "",
    position: "",
    phone: "",
    email: "",
    webmailUrl: DEFAULT_WEBMAIL_URL,
    smtpHost: DEFAULT_SMTP_HOST,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName ?? "",
        dateOfBirth: profile.dateOfBirth ?? "",
        gender: profile.gender ?? "",
        joinDate: profile.joinDate ?? "",
        position: profile.position ?? "",
        phone: profile.phone ?? "",
        email: profile.email ?? "",
        webmailUrl: profile.webmailUrl ?? DEFAULT_WEBMAIL_URL,
        smtpHost: profile.smtpHost ?? DEFAULT_SMTP_HOST,
      });
    }
  }, [
    profile?.id,
    profile?.fullName,
    profile?.dateOfBirth,
    profile?.gender,
    profile?.joinDate,
    profile?.position,
    profile?.phone,
    profile?.email,
    profile?.webmailUrl,
    profile?.smtpHost,
  ]);

  const computedAge = calcAgeFromDateOfBirth(form.dateOfBirth || profile?.dateOfBirth);
  const dateOfBirthError = getProfileAgeError(form.dateOfBirth || null);
  const dobBounds = getProfileDateOfBirthBounds();

  const fullNameError = !form.fullName.trim() ? "Họ và tên không được để trống" : null;

  const handleSave = () => {
    if (fullNameError || (form.dateOfBirth && dateOfBirthError)) return;
    updateMutation.mutate();
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const file = avatarFile ? await compressAvatarFile(avatarFile) : undefined;
      return updateProfile(
        {
          fullName: form.fullName.trim() || null,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          joinDate: form.joinDate || null,
          position: form.position || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          webmailUrl: form.webmailUrl.trim() || DEFAULT_WEBMAIL_URL,
          smtpHost: form.smtpHost.trim() || DEFAULT_SMTP_HOST,
          webmailPassword: webmailPassword.trim() || undefined,
        },
        file
      );
    },
    onSuccess: (updated) => {
      setStoredAuthUser(updated);
      queryClient.setQueryData(["profile", authUser?.id], updated);
      queryClient.invalidateQueries({ queryKey: ["birthdays", "today"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", updated.id] });
      setAvatarVersion((v) => v + 1);
      localStorage.setItem("taskmate_avatar_ts", String(Date.now()));
      window.dispatchEvent(new CustomEvent("taskmate-auth-update"));
      setAvatarFile(null);
      setWebmailPassword("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const baseAvatarUrl = resolveAvatarUrl(profile?.avatar);
  const avatarUrl =
    baseAvatarUrl && !baseAvatarUrl.startsWith("data:")
      ? `${baseAvatarUrl}${baseAvatarUrl.includes("?") ? "&" : "?"}v=${avatarVersion}`
      : baseAvatarUrl;
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
    <div className="w-full min-w-0 space-y-6 pb-28 md:pb-0">
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
                <Label htmlFor="profile-fullName">Họ và tên</Label>
                <Input
                  id="profile-fullName"
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="h-9"
                  autoComplete="name"
                  aria-invalid={!!fullNameError}
                />
                {fullNameError && (
                  <p className="text-xs text-destructive" role="alert">
                    {fullNameError}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-username">Username</Label>
                <Input
                  id="profile-username"
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={profile?.username ?? authUser.username}
                  className="h-9 bg-muted/50 text-muted-foreground"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="profile-dateOfBirth">Ngày sinh</Label>
                  <Input
                    id="profile-dateOfBirth"
                    type="date"
                    min={dobBounds.min}
                    max={dobBounds.max}
                    value={form.dateOfBirth}
                    onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                    aria-invalid={!!dateOfBirthError}
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-age">Độ tuổi</Label>
                  <Input
                    id="profile-age"
                    type="text"
                    readOnly
                    tabIndex={-1}
                    placeholder="Tự tính từ ngày sinh"
                    value={computedAge != null ? `${computedAge} tuổi` : ""}
                    className="h-9 bg-muted/50 text-muted-foreground"
                  />
                </div>
                {dateOfBirthError ? (
                  <p className="text-xs text-destructive sm:col-span-2" role="alert">
                    {dateOfBirthError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Độ tuổi từ 19 đến 99
                  </p>
                )}
              </div>
              <div className="grid gap-2 sm:col-span-2">
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
                <Label htmlFor="profile-phone">Số điện thoại</Label>
                <Input
                  id="profile-phone"
                  type="tel"
                  placeholder="Ví dụ: 0901234567"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="h-9"
                />
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

          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Cấu hình Webmail (gửi mail xin off)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                SMTP port 465 · Webmail{" "}
                <a
                  href={form.webmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mở hộp thư
                </a>
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="profile-webmailUrl">Địa chỉ Webmail</Label>
                <Input
                  id="profile-webmailUrl"
                  type="url"
                  placeholder={DEFAULT_WEBMAIL_URL}
                  value={form.webmailUrl}
                  onChange={(e) => setForm((f) => ({ ...f, webmailUrl: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-smtpHost">SMTP Host</Label>
                <Input
                  id="profile-smtpHost"
                  type="text"
                  placeholder={DEFAULT_SMTP_HOST}
                  value={form.smtpHost}
                  onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-webmail-email">Tài khoản email</Label>
                <Input
                  id="profile-webmail-email"
                  type="email"
                  placeholder="long.nguyen@cybertech.com.vn"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-9"
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="profile-webmailPassword">Mật khẩu webmail</Label>
                <Input
                  id="profile-webmailPassword"
                  type="password"
                  placeholder={
                    profile?.hasWebmailPassword
                      ? "Để trống nếu không đổi mật khẩu"
                      : "Nhập mật khẩu đăng nhập webmail"
                  }
                  value={webmailPassword}
                  onChange={(e) => setWebmailPassword(e.target.value)}
                  className="h-9"
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  Mật khẩu được hash (bcrypt) và mã hóa trước khi lưu DB — không hiển thị lại.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={
                updateMutation.isPending ||
                !!fullNameError ||
                (!!form.dateOfBirth && !!dateOfBirthError)
              }
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
