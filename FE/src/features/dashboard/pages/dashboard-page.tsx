// File: src/features/dashboard/pages/dashboard-page.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { TaskStatus } from "@/shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getTasks, getUsers, getProjects } from "@/shared/api";
import { ListTodo, CheckCircle, Clock, Calendar, User, FolderKanban } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", "dashboard", user?.id],
    queryFn: () =>
      isAdmin ? getTasks() : getTasks({ assigneeId: user?.id ?? undefined }),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const todoTasks = tasks.filter((t) => t.status === "Todo");
  const inProgressTasks = tasks.filter((t) => t.status === "InProgress");
  const doneTasks = tasks.filter((t) => t.status === "Done");

  const todo = todoTasks.length;
  const inProgress = inProgressTasks.length;
  const done = doneTasks.length;

  const getTasksByStatus = (status: TaskStatus | null) => {
    if (!status) return [];
    if (status === "Todo") return todoTasks;
    if (status === "InProgress") return inProgressTasks;
    return doneTasks;
  };

  const assigneeName = (assigneeId: string | null) =>
    assigneeId ? users.find((u) => u.id === assigneeId)?.fullName ?? assigneeId : "—";
  const projectName = (projectId: string) =>
    projects.find((p) => p.id === projectId)?.name ?? projectId;

  const statusLabel: Record<TaskStatus, string> = {
    Todo: "Todo",
    InProgress: "In Progress",
    Done: "Done",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const filteredTasks = getTasksByStatus(selectedStatus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Overview of all tasks" : "Your assigned tasks at a glance"}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          role="button"
          tabIndex={0}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
            selectedStatus === "Todo" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedStatus(selectedStatus === "Todo" ? null : "Todo")}
          onKeyDown={(e) => e.key === "Enter" && setSelectedStatus(selectedStatus === "Todo" ? null : "Todo")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Todo</CardTitle>
            <ListTodo className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todo}</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
            selectedStatus === "InProgress" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedStatus(selectedStatus === "InProgress" ? null : "InProgress")}
          onKeyDown={(e) => e.key === "Enter" && setSelectedStatus(selectedStatus === "InProgress" ? null : "InProgress")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{inProgress}</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
            selectedStatus === "Done" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedStatus(selectedStatus === "Done" ? null : "Done")}
          onKeyDown={(e) => e.key === "Enter" && setSelectedStatus(selectedStatus === "Done" ? null : "Done")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Done</CardTitle>
            <CheckCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{done}</p>
          </CardContent>
        </Card>
      </div>

      {selectedStatus && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Chi tiết: {statusLabel[selectedStatus]}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedStatus(null)}>
              Đóng
            </Button>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">
                Không có task nào ở trạng thái {statusLabel[selectedStatus]}.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <Card key={task.id} className="border-l-4 border-l-primary/50">
                    <CardContent className="pt-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <Link
                          to={`/tasks/${task.id}`}
                          className="text-lg font-medium text-primary hover:underline"
                        >
                          {task.title}
                        </Link>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/tasks/${task.id}`}>Xem chi tiết</Link>
                        </Button>
                      </div>
                      {task.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="size-4 shrink-0" />
                          {assigneeName(task.assigneeId)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderKanban className="size-4 shrink-0" />
                          {projectName(task.projectId)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-4 shrink-0" />
                          Deadline: {task.deadline}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
