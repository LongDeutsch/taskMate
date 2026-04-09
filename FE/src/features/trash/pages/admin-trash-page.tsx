import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDeletedUsers,
  getDeletedProjects,
  getDeletedTasks,
  restoreUser,
  restoreProject,
  restoreTask,
} from "@/shared/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";

function fmt(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export function AdminTrashPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users", "trash"],
    queryFn: getDeletedUsers,
  });
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects", "trash"],
    queryFn: getDeletedProjects,
  });
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks", "trash"],
    queryFn: getDeletedTasks,
  });

  const restoreUserMutation = useMutation({
    mutationFn: restoreUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "trash"] });
    },
  });
  const restoreProjectMutation = useMutation({
    mutationFn: restoreProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "trash"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "trash"] });
    },
  });
  const restoreTaskMutation = useMutation({
    mutationFn: restoreTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "trash"] });
    },
  });

  const isLoading = loadingUsers || loadingProjects || loadingTasks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Thùng rác</h1>
        <p className="text-muted-foreground">
          Dữ liệu đã xóa của Projects, Tasks, Users. Có thể khôi phục trong vòng 5 ngày.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects đã xóa</CardTitle>
          <CardDescription>{projects.length} items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có project trong thùng rác.</p>
          ) : (
            projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 gap-2">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">Restore trước: {fmt(p.restoreUntil)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreProjectMutation.mutate(p.id)}
                  disabled={restoreProjectMutation.isPending}
                >
                  <Undo2 className="size-4" />
                  Khôi phục
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks đã xóa</CardTitle>
          <CardDescription>{tasks.length} items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có task trong thùng rác.</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border p-3 gap-2">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-sm text-muted-foreground">Restore trước: {fmt(t.restoreUntil)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreTaskMutation.mutate(t.id)}
                  disabled={restoreTaskMutation.isPending}
                >
                  <Undo2 className="size-4" />
                  Khôi phục
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users đã xóa</CardTitle>
          <CardDescription>{users.length} items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có user trong thùng rác.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border p-3 gap-2">
                <div>
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {u.username} · Restore trước: {fmt(u.restoreUntil)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreUserMutation.mutate(u.id)}
                  disabled={restoreUserMutation.isPending}
                >
                  <Undo2 className="size-4" />
                  Khôi phục
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
