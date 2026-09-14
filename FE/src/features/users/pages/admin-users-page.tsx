// File: src/features/users/pages/admin-users-page.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, createUser, deleteUser, deleteAllUsers } from "@/shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { z } from "zod";
import { Check, Plus, Search, SearchX, Trash2, X } from "lucide-react";
import { formatRoleLabel, getRoleLabel, type RoleLabel } from "@/shared/types";
import { toast } from "@/shared/lib/toast";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { cn } from "@/shared/lib/utils";

const ROLE_LABEL_OPTIONS: {
  value: RoleLabel;
  label: string;
  help: string;
  active: string;
}[] = [
  {
    value: "STAFF",
    label: "Staff",
    help: "Quyền user thông thường",
    active: "border-slate-700 bg-slate-100 ring-2 ring-slate-700",
  },
  {
    value: "HR",
    label: "HR",
    help: "Tạm thời quyền như Staff",
    active: "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600",
  },
  {
    value: "ADMIN",
    label: "Admin",
    help: "Đầy đủ quyền PM",
    active: "border-violet-600 bg-violet-50 ring-2 ring-violet-600",
  },
  {
    value: "BODS",
    label: "BODs",
    help: "Tạm thời quyền như Staff",
    active: "border-amber-500 bg-amber-50 ring-2 ring-amber-500",
  },
];

const createUserSchema = z
  .object({
    username: z.string().min(1, "Tên đăng nhập không được để trống"),
    fullName: z.string().min(1, "Họ và tên không được để trống"),
    email: z.string().optional(),
    roleLabel: z.enum(["ADMIN", "STAFF", "HR", "BODS"]),
  })
  .superRefine((data, ctx) => {
    if (data.roleLabel === "HR") {
      const email = data.email?.trim() ?? "";
      if (!email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email bắt buộc khi tạo user HR",
          path: ["email"],
        });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email không hợp lệ",
          path: ["email"],
        });
      }
    }
  });

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState<RoleLabel>("STAFF");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | RoleLabel>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const roleCounts = {
    ALL: users.length,
    STAFF: users.filter((u) => getRoleLabel(u) === "STAFF").length,
    HR: users.filter((u) => getRoleLabel(u) === "HR").length,
    ADMIN: users.filter((u) => getRoleLabel(u) === "ADMIN").length,
    BODS: users.filter((u) => getRoleLabel(u) === "BODS").length,
  };

  const filteredUsers = users.filter((u) => {
    const userRole = getRoleLabel(u);
    if (roleFilter !== "ALL" && userRole !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      username: string;
      fullName: string;
      email?: string;
      roleLabel: RoleLabel;
    }) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Thêm thành viên mới thành công!");
      setOpen(false);
      setUsername("");
      setFullName("");
      setEmail("");
      setRoleLabel("STAFF");
      setError(null);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo user";
      setError(msg);
      toast.error("Lỗi tạo user", msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "trash"] });
      toast.success("Đã chuyển user vào thùng rác!");
    },
    onError: (err) => {
      toast.error("Lỗi xóa user", err instanceof Error ? err.message : undefined);
    },
  });

  const deletableUsers = users.filter(
    (u) => u.role !== "ADMIN" && u.username !== "pm"
  );

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllUsers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "trash"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Đã xóa tất cả user!");
    },
    onError: (err) => {
      toast.error("Lỗi xóa tất cả user", err instanceof Error ? err.message : undefined);
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = createUserSchema.safeParse({ username, fullName, email, roleLabel });
    if (!result.success) {
      setError(result.error.issues.map((issue) => issue.message).join(". "));
      return;
    }
    createMutation.mutate({
      ...result.data,
      email: result.data.email?.trim() || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-28 md:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Quản lý người dùng</h1>
          <p className="text-muted-foreground">Quản lý danh sách thành viên trong hệ thống (Dành cho Quản trị viên)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            disabled={deletableUsers.length === 0 || deleteAllMutation.isPending}
            onClick={() => {
              setConfirmState({
                open: true,
                title: "Xóa tất cả user?",
                message: `Xóa tất cả ${deletableUsers.length} user? Tài khoản PM (admin) được giữ lại. User sẽ vào thùng rác 5 ngày.`,
                onConfirm: () => deleteAllMutation.mutate(),
              });
            }}
          >
            <Trash2 className="size-4" />
            Xóa tất cả
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Thêm người dùng
          </Button>
        </div>
      </div>

      {open && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tạo người dùng mới</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Hủy
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Họ và tên"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">
                  Email{roleLabel === "HR" ? " *" : ""}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    roleLabel === "HR"
                      ? "hr@cybertech.com.vn"
                      : "Tùy chọn (bắt buộc với HR)"
                  }
                  required={roleLabel === "HR"}
                />
                {roleLabel === "HR" && (
                  <p className="text-xs text-muted-foreground">
                    Email HR dùng để nhận thông báo xin off qua SMTP.
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>
                  Vai trò <span className="text-xs font-normal text-muted-foreground">(đang chọn: {formatRoleLabel(roleLabel)})</span>
                </Label>
                <div
                  role="radiogroup"
                  aria-label="Role"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  {ROLE_LABEL_OPTIONS.map((opt) => {
                    const active = roleLabel === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setRoleLabel(opt.value)}
                        className={`relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                          active
                            ? opt.active
                            : "border-slate-200 bg-background hover:bg-accent"
                        }`}
                      >
                        {active && (
                          <span className="absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                            <Check className="size-3" />
                          </span>
                        )}
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.help}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Default password: 123456. Admin có quyền PM; HR/BODs hiện tạm
                thời chia sẻ quyền với Staff.
              </p>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-4 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Danh sách người dùng</CardTitle>
              <CardDescription className="mt-1">
                {searchQuery.trim() || roleFilter !== "ALL"
                  ? `Tìm thấy ${filteredUsers.length} trên tổng số ${users.length} người dùng`
                  : `Tổng cộng ${users.length} người dùng (Xóa user sẽ đưa vào thùng rác 5 ngày)`}
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, username, email..."
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
          </div>

          {/* Role filter pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(["ALL", "STAFF", "HR", "ADMIN", "BODS"] as const).map((r) => {
              const active = roleFilter === r;
              const label = r === "ALL" ? "Tất cả" : formatRoleLabel(r);
              const count = roleCounts[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px]",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Chưa có user nào.</p>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SearchX className="mb-3 size-10 text-muted-foreground/60" />
              <p className="font-medium text-foreground">Không tìm thấy người dùng</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Không có tài khoản nào khớp với điều kiện lọc hiện tại.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("ALL");
                }}
              >
                Đặt lại bộ lọc
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredUsers.map((user) => {
                const userRoleLabel = getRoleLabel(user);
                return (
                  <div
                    key={user.id}
                    className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          userRoleLabel === "ADMIN"
                            ? "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-1 dark:ring-violet-800/60"
                            : userRoleLabel === "HR"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-800/60"
                              : userRoleLabel === "BODS"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-1 dark:ring-amber-800/60"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {formatRoleLabel(userRoleLabel)}
                      </span>
                      <div>
                        <Link
                          to={`/users/${user.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {user.fullName}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          @{user.username}
                          {user.email && ` · ${user.email}`}
                          {user.disabled && " · (Vô hiệu hóa)"}
                        </p>
                      </div>
                    </div>
                    {user.role === "USER" && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/users/${user.id}`}>Xem hồ sơ</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/users/${user.id}`}>Dự án</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={() => {
                            setConfirmState({
                              open: true,
                              title: "Xóa user?",
                              message: `Xóa user "${user.fullName}" (@${user.username})? User sẽ nằm trong thùng rác 5 ngày.`,
                              onConfirm: () => deleteMutation.mutate(user.id),
                            });
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                          Xóa
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant="danger"
        loading={deleteMutation.isPending || deleteAllMutation.isPending}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState((s) => ({ ...s, open: false }));
        }}
      />
    </div>
  );
}
