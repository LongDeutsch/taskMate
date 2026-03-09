// File: src/features/projects/pages/admin-project-detail-page.tsx
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProjects, getTasks, getUsers } from "@/shared/api";
import type { Task, TaskStatus } from "@/shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const statusLabel: Record<TaskStatus, string> = {
  Todo: "Todo",
  InProgress: "In Progress",
  Done: "Done",
};

export function AdminProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", "project", id],
    queryFn: () => getTasks({ projectId: id ?? "" }),
    enabled: !!id,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const project = projects.find((p) => p.id === id);

  // Thành viên tham gia = users có ít nhất 1 task trong dự án này
  const assigneeIds = [...new Set(tasks.map((t) => t.assigneeId).filter(Boolean))] as string[];
  const members = users.filter((u) => assigneeIds.includes(u.id));

  const getTasksByUser = (userId: string): Task[] =>
    tasks.filter((t) => t.assigneeId === userId);

  if (!id) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Invalid project.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/admin/projects">Back to Projects</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Project not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/admin/projects">Back to Projects</Link>
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
          <Link to="/admin/projects">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.description || "—"}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Thành viên tham gia
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Các user được giao task trong dự án, kèm trạng thái task (Todo / In Progress / Done). Trống task = chưa được giao task nào.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              Chưa có thành viên nào được giao task trong dự án này.
            </p>
          ) : (
            members.map((user) => {
              const userTasks = getTasksByUser(user.id);
              const todo = userTasks.filter((t) => t.status === "Todo").length;
              const inProgress = userTasks.filter((t) => t.status === "InProgress").length;
              const done = userTasks.filter((t) => t.status === "Done").length;

              return (
                <Card key={user.id} className="border-l-4 border-l-primary/50">
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.username}
                          {user.disabled && " · Disabled"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {userTasks.length === 0 ? (
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
                    {userTasks.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t pt-3">
                        {userTasks.map((t) => (
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
