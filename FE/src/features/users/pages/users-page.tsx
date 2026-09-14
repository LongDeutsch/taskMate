import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsers } from "@/shared/api";
import { UserAvatar } from "@/shared/components/user-avatar";
import { useAvatarCacheBust } from "@/shared/hooks/use-avatar-cache-bust";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { formatRoleLabel, getRoleLabel } from "@/shared/types";
import { PageHeader } from "@/app/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Search, SearchX, X } from "lucide-react";

function roleBadgeClass(roleLabel: ReturnType<typeof getRoleLabel>) {
  switch (roleLabel) {
    case "ADMIN":
      return "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-1 dark:ring-violet-800/60";
    case "HR":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-800/60";
    case "BODS":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-1 dark:ring-amber-800/60";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const avatarTs = useAvatarCacheBust();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    };
    window.addEventListener("taskmate-auth-update", refresh);
    return () => window.removeEventListener("taskmate-auth-update", refresh);
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const activeUsers = users.filter((u) => !u.disabled);

  const filteredUsers = activeUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.position && u.position.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full min-w-0 space-y-6 pb-28 md:pb-0">
      <PageHeader
        title="Thành viên"
        subtitle="Xem hồ sơ và thông tin đồng nghiệp trong hệ thống"
      />

      <Card>
        <CardHeader className="gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Danh sách thành viên</CardTitle>
            <CardDescription className="mt-1">
              {searchQuery.trim()
                ? `Tìm thấy ${filteredUsers.length} trên tổng số ${activeUsers.length} thành viên`
                : `${activeUsers.length} người đang hoạt động`}
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, username, vị trí..."
              className="h-10 pl-9 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2.5 pt-0">
          {activeUsers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Chưa có thành viên nào.</p>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SearchX className="mb-3 size-10 text-muted-foreground/60" />
              <p className="font-medium text-foreground">Không tìm thấy thành viên</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Không có kết quả nào khớp với &quot;{searchQuery}&quot;
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSearchQuery("")}
              >
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const roleLabel = getRoleLabel(user);
              return (
                <div
                  key={user.id}
                  className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <UserAvatar
                      avatar={user.avatar}
                      cacheBust={user.id === authUser?.id ? avatarTs : undefined}
                      className="size-11 shrink-0 border border-border"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/users/${user.id}`}
                          className="font-semibold text-primary hover:underline [overflow-wrap:anywhere]"
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
                      <Eye className="size-4 mr-1.5" />
                      Xem hồ sơ
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
