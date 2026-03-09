// File: src/features/users/pages/admin-users-page.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, createUser, toggleUserDisabled } from "@/shared/api";
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
import { Plus, UserX, UserCheck } from "lucide-react";

const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
});

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const createMutation = useMutation({
    mutationFn: (data: { username: string; fullName: string }) =>
      createUser({ ...data, role: "USER" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setUsername("");
      setFullName("");
      setError(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleUserDisabled,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = createUserSchema.safeParse({ username, fullName });
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage users (Admin only)</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Add user
        </Button>
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
              <p className="text-xs text-muted-foreground">
                New users get role USER and default password: 123456
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
          <CardDescription>Enable or disable user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <Link
                    to={user.role === "USER" ? `/admin/users/${user.id}` : "#"}
                    className={user.role === "USER" ? "font-medium text-primary hover:underline" : "font-medium"}
                  >
                    {user.fullName}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {user.username} · {user.role}
                    {user.disabled && " · Disabled"}
                  </p>
                </div>
                {user.role === "USER" && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/users/${user.id}`}>Xem dự án</Link>
                    </Button>
                    <Button
                    variant={user.disabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleMutation.mutate(user.id)}
                    disabled={toggleMutation.isPending}
                  >
                    {user.disabled ? (
                      <>
                        <UserCheck className="size-4" />
                        Enable
                      </>
                    ) : (
                      <>
                        <UserX className="size-4" />
                        Disable
                      </>
                    )}
                  </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
