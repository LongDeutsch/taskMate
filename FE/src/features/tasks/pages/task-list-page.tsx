// File: src/features/tasks/pages/task-list-page.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTasks } from "../hooks/use-tasks";
import type { TaskStatus } from "@/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getStoredUsers, getStoredProjects, getStoredTasks } from "@/shared/api/mock-data";
import { Search, Calendar } from "lucide-react";

const statusOptions: { value: TaskStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "Todo", label: "Todo" },
  { value: "InProgress", label: "In Progress" },
  { value: "Done", label: "Done" },
];

export function TaskListPage() {
  const { isAdmin, user } = useAuth();
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [sortBy, setSortBy] = useState<"deadline" | "createdAt">("deadline");

  const { data: tasks = [], isLoading, isError } = useTasks({
    status: status || undefined,
    search: search || undefined,
    projectId: projectId || undefined,
    sortBy,
  });

  const users = getStoredUsers();
  const projects = getStoredProjects();
  const allTasks = getStoredTasks();
  const projectOptions = isAdmin
    ? projects
    : projects.filter((p) =>
        allTasks.some((t) => t.assigneeId === user?.id && t.projectId === p.id)
      );
  const getAssigneeName = (assigneeId: string | null) => {
    if (!assigneeId) return "—";
    return users.find((u) => u.id === assigneeId)?.fullName ?? assigneeId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-center text-destructive">
          Failed to load tasks. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Tasks</h1>
          <p className="text-muted-foreground">View tasks assigned to you (read-only)</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link to="/admin/tasks">Manage tasks (Admin)</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and sort your tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">All projects</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus((e.target.value || "") as TaskStatus | "")}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "deadline" | "createdAt")}
          >
            <option value="deadline">Sort by deadline</option>
            <option value="createdAt">Sort by created</option>
          </select>
        </CardContent>
      </Card>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Calendar className="size-12 mb-4 opacity-50" />
            <p className="font-medium">No tasks found</p>
            <p className="text-sm">Try changing filters or you have no assigned tasks.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/tasks/${task.id}`}
                    className="font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {task.title}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {task.description}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{task.status}</span>
                    <span>·</span>
                    <span>{task.priority}</span>
                    <span>·</span>
                    <span>Due {task.deadline}</span>
                    <span>·</span>
                    <span>{getAssigneeName(task.assigneeId)}</span>
                    <span>·</span>
                    <span>{projects.find((p) => p.id === task.projectId)?.name ?? task.projectId}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/tasks/${task.id}`}>View</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
