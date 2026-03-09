// File: src/features/tasks/pages/task-detail-page.tsx
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTask } from "../hooks/use-task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStoredUsers, getStoredProjects } from "@/shared/api/mock-data";
import { ArrowLeft } from "lucide-react";

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading, isError } = useTask(id);
  const users = getStoredUsers();
  const projects = getStoredProjects();

  const assigneeName = task?.assigneeId
    ? users.find((u) => u.id === task.assigneeId)?.fullName ?? task.assigneeId
    : "Unassigned";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Task not found or failed to load.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/tasks">Back to tasks</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/tasks");
          }}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <p className="text-muted-foreground">Task detail (read-only)</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="mt-1">{task.description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="mt-1">{task.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Priority</p>
              <p className="mt-1">{task.priority}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Deadline</p>
              <p className="mt-1">{task.deadline}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assignee</p>
              <p className="mt-1">{assigneeName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Project</p>
              <p className="mt-1">{projects.find((p) => p.id === task.projectId)?.name ?? task.projectId}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
