import { Link } from "react-router-dom";
import { User } from "lucide-react";
import type { User as AppUser } from "@/shared/types";
import { formatRoleLabel, getRoleLabel } from "@/shared/types";
import { UserAvatar } from "@/shared/components/user-avatar";
import { useAvatarCacheBust } from "@/shared/hooks/use-avatar-cache-bust";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calcAgeFromDateOfBirth } from "@/shared/lib/birthday";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    const [y, m, d] = value.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d).toLocaleDateString("vi-VN");
    return value;
  } catch {
    return value;
  }
}

function roleBadgeClass(roleLabel: ReturnType<typeof getRoleLabel>) {
  switch (roleLabel) {
    case "ADMIN":
      return "bg-violet-100 text-violet-800";
    case "HR":
      return "bg-emerald-100 text-emerald-800";
    case "BODS":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

type UserProfileViewProps = {
  user: AppUser;
  isOwnProfile?: boolean;
};

export function UserProfileView({ user, isOwnProfile }: UserProfileViewProps) {
  const { user: authUser } = useAuth();
  const avatarTs = useAvatarCacheBust();
  const roleLabel = getRoleLabel(user);
  const age = user.age ?? calcAgeFromDateOfBirth(user.dateOfBirth);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5" />
          Hồ sơ {user.fullName}
        </CardTitle>
        <CardDescription>
          {user.username} · {formatRoleLabel(roleLabel)}
          {user.disabled ? " · Đã vô hiệu" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-2">
            <UserAvatar
              avatar={user.avatar}
              cacheBust={
                isOwnProfile || user.id === authUser?.id ? avatarTs : undefined
              }
              className="size-24 border-2 border-border"
              iconClassName="size-12"
            />
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass(roleLabel)}`}
            >
              {formatRoleLabel(roleLabel)}
            </span>
          </div>

          <dl className="grid flex-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Họ tên</dt>
              <dd className="mt-1 text-sm font-medium">{user.fullName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Username</dt>
              <dd className="mt-1 text-sm">{user.username}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Ngày sinh</dt>
              <dd className="mt-1 text-sm">{formatDate(user.dateOfBirth)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Độ tuổi</dt>
              <dd className="mt-1 text-sm">{age != null ? `${age} tuổi` : "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Giới tính</dt>
              <dd className="mt-1 text-sm">{user.gender || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Số điện thoại</dt>
              <dd className="mt-1 text-sm [overflow-wrap:anywhere]">{user.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1 text-sm [overflow-wrap:anywhere]">
                {user.email ? (
                  <a href={`mailto:${user.email}`} className="text-primary hover:underline">
                    {user.email}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Ngày vào làm</dt>
              <dd className="mt-1 text-sm">{formatDate(user.joinDate)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">Chức vụ</dt>
              <dd className="mt-1 text-sm">{user.position || "—"}</dd>
            </div>
          </dl>
        </div>

        {isOwnProfile && (
          <Button asChild variant="outline">
            <Link to="/profile">Chỉnh sửa hồ sơ của tôi</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
