// File: src/features/dashboard/pages/dashboard-page.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskStatus } from "@/shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  deleteBugReport,
  getTasks,
  getUsers,
  getProjects,
  getOpenBugReports,
  updateBugReport,
  updateBugReportStatus,
} from "@/shared/api";
import { TodayBirthdaySection } from "@/features/dashboard/components/today-birthday-section";
import type { BugReport, BugReportStatus } from "@/shared/types";
import { BugReportIconActions } from "@/features/bug-reports/components/bug-report-actions";
import { BugEditModal, BugViewModal } from "@/features/bug-reports/components/bug-report-modals";
import { BugStatusBadge } from "@/features/bug-reports/components/bug-report-ui";
import { at } from "@/features/tasks/components/admin-tasks-ui";
import { ListTodo, CheckCircle, Clock, Calendar, User, FolderKanban, Bug } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);
  const [viewBug, setViewBug] = useState<BugReport | null>(null);
  const [editBug, setEditBug] = useState<BugReport | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const { data: openBugs = [], isLoading: bugsLoading } = useQuery({
    queryKey: ["bug-reports", "open"],
    queryFn: getOpenBugReports,
  });

  const bugStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BugReportStatus }) =>
      updateBugReportStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-reports", "open"] });
      if (updated.status === "done") setViewBug(null);
      else setViewBug((prev) => (prev?.id === updated.id ? updated : prev));
    },
  });

  const bugUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title: string; content: string } }) =>
      updateBugReport(id, data),
    onSuccess: (updated) => {
      setEditError(null);
      setEditBug(null);
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-reports", "open"] });
      setViewBug((prev) => (prev?.id === updated.id ? updated : prev));
    },
    onError: (err) => {
      setEditError(err instanceof Error ? err.message : "Không lưu được bug");
    },
  });

  const bugDeleteMutation = useMutation({
    mutationFn: deleteBugReport,
    onSuccess: () => {
      setViewBug(null);
      setEditBug(null);
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-reports", "open"] });
    },
  });

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

  const assigneeNameForTask = (task: Task) =>
    task.assigneeId
      ? task.assigneeName ??
        users.find((u) => u.id === task.assigneeId)?.fullName ??
        task.assigneeId
      : "—";
  const projectName = (projectId: string | null) =>
    projectId
      ? projects.find((p) => p.id === projectId)?.name ?? projectId
      : "— (note cá nhân)";

  const statusLabel: Record<TaskStatus, string> = {
    Todo: "Todo",
    InProgress: "In Progress",
    Done: "Done",
  };

  if (isLoading || bugsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const filteredTasks = getTasksByStatus(selectedStatus);

  return (
    <div className="w-full min-w-0 space-y-6 pb-28 md:pb-0">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Overview of all tasks" : "Your assigned tasks at a glance"}
        </p>
      </div>

      <TodayBirthdaySection currentUserId={user?.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bug className="size-5 text-amber-600" />
              Bug cần xử lý
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              To do và In progress — mọi user có thể xem
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/bug-reports">Xem tất cả</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {openBugs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Không có bug cần xử lý.
            </p>
          ) : (
            <ul className="space-y-3">
              {openBugs.map((bug) => (
                <DashboardBugRow
                  key={bug.id}
                  bug={bug}
                  userId={user?.id}
                  isAdmin={isAdmin}
                  onView={() => setViewBug(bug)}
                  onEdit={() => {
                    setEditError(null);
                    setEditBug(bug);
                  }}
                  onDelete={() => {
                    if (confirm("Xóa bug report này?")) bugDeleteMutation.mutate(bug.id);
                  }}
                  deletePending={bugDeleteMutation.isPending}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <BugViewModal
        open={!!viewBug}
        bug={viewBug}
        isAdmin={isAdmin}
        onClose={() => setViewBug(null)}
        onStatusChange={
          isAdmin && viewBug
            ? (status) => bugStatusMutation.mutate({ id: viewBug.id, status })
            : undefined
        }
        statusPending={bugStatusMutation.isPending}
      />

      <BugEditModal
        open={!!editBug}
        bug={editBug}
        onClose={() => {
          setEditBug(null);
          setEditError(null);
        }}
        onSave={(data) => editBug && bugUpdateMutation.mutate({ id: editBug.id, data })}
        isPending={bugUpdateMutation.isPending}
        error={editError}
      />

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
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="size-4 shrink-0" />
                          {assigneeNameForTask(task)}
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

function formatBugDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

function DashboardBugRow({
  bug,
  userId,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  deletePending,
}: {
  bug: BugReport;
  userId: string | undefined;
  isAdmin: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  return (
    <li className={at.taskCard}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-gray-900">{bug.title}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BugStatusBadge status={bug.status} />
            <span className="inline-flex max-w-[200px] truncate rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {bug.userName}
            </span>
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {formatBugDate(bug.createdAt)}
            </span>
          </div>
        </div>
        <BugReportIconActions
          bug={bug}
          userId={userId}
          isAdmin={isAdmin}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          deletePending={deletePending}
        />
      </div>
    </li>
  );
}
