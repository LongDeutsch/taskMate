// File: src/features/users/pages/admin-user-detail-page.tsx
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProjects, getTasks, getUsers } from "@/shared/api";
import type { Task, TaskStatus } from "@/shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const statusLabel: Record<TaskStatus, string> = {
  Todo: "Todo",
  InProgress: "In Progress",
  Done: "Done",
};

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", "user", id],
    queryFn: () => getTasks({ assigneeId: id ?? "" }),
    enabled: !!id,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const user = users.find((u) => u.id === id);

  // Các dự án user tham gia = projects có ít nhất 1 task assign cho user này
  const projectIds = [...new Set(tasks.map((t) => t.projectId))];
  const userProjects = projects.filter((p) => projectIds.includes(p.id));

  const getTasksByProject = (projectId: string): Task[] =>
    tasks.filter((t) => t.projectId === projectId);

  if (!id) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Invalid user.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/admin/users">Back to Users</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>User not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/admin/users">Back to Users</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/users">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{user.fullName}</h1>
          <p className="text-muted-foreground">
            {user.username} · {user.role}
            {user.disabled && " · Disabled"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="size-5" />
            Dự án tham gia
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Các dự án user đang có task, kèm trạng thái task (Todo / In Progress / Done). Trống task = chưa có task nào trong dự án.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {userProjects.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              User chưa tham gia dự án nào (chưa có task được giao).
            </p>
          ) : (
            userProjects.map((project) => {
              const projectTasks = getTasksByProject(project.id);
              const todo = projectTasks.filter((t) => t.status === "Todo").length;
              const inProgress = projectTasks.filter((t) => t.status === "InProgress").length;
              const done = projectTasks.filter((t) => t.status === "Done").length;

              return (
                <Card key={project.id} className="border-l-4 border-l-primary/50">
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/admin/projects/${project.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {project.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {project.description || "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {projectTasks.length === 0 ? (
                          <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
                            Trống task
                          </span>
                        ) : (
                          <>
                            {todo > 0 && (
                              <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                                Todo: {todo}
                              </span>
                            )}
                            {inProgress > 0 && (
                              <span className="rounded-md bg-blue-100 px-2 py-1 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                                In Progress: {inProgress}
                              </span>
                            )}
                            {done > 0 && (
                              <span className="rounded-md bg-green-100 px-2 py-1 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                                Done: {done}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {projectTasks.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t pt-3">
                        {projectTasks.map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <Link
                              to={`/tasks/${t.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {t.title}
                            </Link>
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-xs",
                                t.status === "Done" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
                                t.status === "InProgress" && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
                                t.status === "Todo" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                              )}
                            >
                              {statusLabel[t.status]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
