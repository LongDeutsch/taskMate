import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getUsers, apiBaseUrl } from "@/shared/api";
import { formatRoleLabel, getRoleLabel } from "@/shared/types";
import { PageHeader } from "@/app/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, User } from "lucide-react";

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

export function UsersPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const activeUsers = users.filter((u) => !u.disabled);

  return (
    <div className="w-full min-w-0 space-y-6 pb-28 md:pb-0">
      <PageHeader
        title="Users"
        subtitle="Xem hồ sơ và thông tin đồng đội trong team"
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách thành viên</CardTitle>
          <CardDescription>{activeUsers.length} người đang hoạt động</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeUsers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Chưa có user nào.</p>
          ) : (
            activeUsers.map((user) => {
              const roleLabel = getRoleLabel(user);
              const avatarSrc = user.avatar
                ? user.avatar.startsWith("http")
                  ? user.avatar
                  : `${apiBaseUrl}${user.avatar}`
                : null;

              return (
                <div
                  key={user.id}
                  className="flex min-w-0 flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="size-11 shrink-0 overflow-hidden rounded-full bg-muted border border-border flex items-center justify-center">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" className="size-full object-cover" />
                      ) : (
                        <User className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/users/${user.id}`}
                          className="font-medium text-primary hover:underline [overflow-wrap:anywhere]"
                        >
                          {user.fullName}
                        </Link>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${roleBadgeClass(roleLabel)}`}
                        >
                          {formatRoleLabel(roleLabel)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{user.username}
                        {user.position ? ` · ${user.position}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="shrink-0 self-start sm:self-center">
                    <Link to={`/users/${user.id}`}>
                      <Eye className="size-4" />
                      Xem profile
                    </Link>
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
