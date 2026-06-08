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
import { Check, Plus, Trash2 } from "lucide-react";
import { formatRoleLabel, getRoleLabel, type RoleLabel } from "@/shared/types";

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

const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
  roleLabel: z.enum(["ADMIN", "STAFF", "HR", "BODS"]),
});

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleLabel, setRoleLabel] = useState<RoleLabel>("STAFF");
  const [error, setError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const createMutation = useMutation({
    mutationFn: (data: { username: string; fullName: string; roleLabel: RoleLabel }) =>
      createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setUsername("");
      setFullName("");
      setRoleLabel("STAFF");
      setError(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "trash"] });
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
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = createUserSchema.safeParse({ username, fullName, roleLabel });
    if (!result.success) {
      setError(result.error.issues.map((issue) => issue.message).join(". "));
      return;
    }
    createMutation.mutate(result.data);
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
          <h1 className="text-xl font-bold sm:text-2xl">Users</h1>
          <p className="text-muted-foreground">Manage users (Admin only)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            disabled={deletableUsers.length === 0 || deleteAllMutation.isPending}
            onClick={() => {
              if (
                !confirm(
                  `Xóa tất cả ${deletableUsers.length} user? Tài khoản PM (admin) được giữ lại. User sẽ vào thùng rác 5 ngày.`
                )
              ) {
                return;
              }
              deleteAllMutation.mutate();
            }}
          >
            <Trash2 className="size-4" />
            Xóa tất cả
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Add user
          </Button>
        </div>
      </div>

      {open && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Create user</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                />
              </div>
              <div className="grid gap-2">
                <Label>
                  Role <span className="text-xs font-normal text-muted-foreground">(đang chọn: {formatRoleLabel(roleLabel)})</span>
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
        <CardHeader>
          <CardTitle>User list</CardTitle>
          <CardDescription>Xóa user sẽ đưa vào thùng rác 5 ngày</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => {
              const userRoleLabel = getRoleLabel(user);
              return (
              <div
                key={user.id}
                className="flex min-w-0 flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      userRoleLabel === "ADMIN"
                        ? "bg-violet-100 text-violet-800"
                        : userRoleLabel === "HR"
                          ? "bg-emerald-100 text-emerald-800"
                          : userRoleLabel === "BODS"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {formatRoleLabel(userRoleLabel)}
                  </span>
                  <div>
                    <Link
                      to={`/users/${user.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {user.fullName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {user.username}
                      {user.disabled && " · Disabled"}
                    </p>
                  </div>
                </div>
                {user.role === "USER" && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/users/${user.id}`}>Xem profile</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/users/${user.id}`}>Dự án</Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={() => {
                        if (confirm("Xóa user này? User sẽ nằm trong thùng rác 5 ngày.")) {
                          deleteMutation.mutate(user.id);
                        }
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
        </CardContent>
      </Card>
    </div>
  );
}
