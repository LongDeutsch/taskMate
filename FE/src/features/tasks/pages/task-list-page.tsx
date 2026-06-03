// File: src/features/tasks/pages/task-list-page.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTasks } from "../hooks/use-tasks";
import type { Task, TaskPriority, TaskStatus, User } from "@/shared/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getUsers, userUpdateTask } from "@/shared/api";
import {
  at,
  AssigneeTag,
  DeadlineTag,
  ProjectTag,
  TaskPriorityLabel,
  TaskStatusLabel,
} from "../components/admin-tasks-ui";
import { UserResponseEditor } from "../components/user-response-editor";
import { Calendar, Eye, Loader2, Search, Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const statusOptions: { value: TaskStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả status" },
  { value: "Todo", label: "Todo" },
  { value: "InProgress", label: "In Progress" },
  { value: "Done", label: "Done" },
];

const priorityOptions: { value: TaskPriority | ""; label: string }[] = [
  { value: "", label: "Tất cả priority" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

export function TaskListPage() {
  const { isAdmin, user } = useAuth();
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [sortBy, setSortBy] = useState<"deadline" | "createdAt" | "priority">("deadline");

  const { data: tasks = [], isLoading, isError } = useTasks({
    status: status || undefined,
    priority: priority || undefined,
    search: search.trim() || undefined,
    projectId: projectId || undefined,
    sortBy,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users", "task-list-assignee"],
    queryFn: getUsers,
    enabled: isAdmin,
  });

  const projectOptions = Array.from(
    new Map(
      tasks
        .filter((t): t is Task & { projectId: string } => !!t.projectId)
        .map((t) => [t.projectId, t.projectName ?? t.projectId] as const)
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const getAssigneeName = (task: Task) => {
    if (!task.assigneeId) return "Chưa gán";
    if (task.assigneeName != null && task.assigneeName !== "") return task.assigneeName;
    if (task.assigneeId === user?.id) return user.fullName;
    return users.find((u) => u.id === task.assigneeId)?.fullName ?? task.assigneeId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`${at.surface} px-6 py-12 text-center text-sm text-red-600`}>
        Không tải được danh sách task. Vui lòng thử lại.
      </div>
    );
  }

  return (
    <div className={at.page}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={at.pageTitle}>My Tasks</h1>
          <p className={at.pageSubtitle}>
            Task được giao cho bạn · {tasks.length} task
          </p>
        </div>
        {isAdmin && (
          <Button asChild variant="outline" className="border-gray-200 shrink-0">
            <Link to="/admin/tasks">Quản lý task (Admin)</Link>
          </Button>
        )}
      </header>

      <div className={at.surface}>
        <div className={at.toolbar}>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              className={at.search}
              placeholder="Tìm theo tiêu đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm task"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={at.select}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label="Lọc project"
            >
              <option value="">Tất cả project</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className={at.select}
              value={status}
              onChange={(e) => setStatus((e.target.value || "") as TaskStatus | "")}
              aria-label="Lọc status"
            >
              {statusOptions.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className={at.select}
              value={priority}
              onChange={(e) => setPriority((e.target.value || "") as TaskPriority | "")}
              aria-label="Lọc priority"
            >
              {priorityOptions.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className={at.select}
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "deadline" | "createdAt" | "priority")
              }
              aria-label="Sắp xếp"
            >
              <option value="deadline">Deadline</option>
              <option value="createdAt">Mới nhất</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className={`${at.surface} flex flex-col items-center justify-center px-6 py-16 text-center`}>
          <Calendar className="mb-4 size-12 text-gray-300" />
          <p className="font-medium text-gray-900">Không có task</p>
          <p className="mt-1 text-sm text-gray-500">
            {search.trim()
              ? "Thử đổi từ khóa hoặc bộ lọc."
              : "Bạn chưa được giao task nào."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <UserTaskCard
              key={task.id}
              task={task}
              currentUser={user}
              assigneeLabel={getAssigneeName(task)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface UserTaskCardProps {
  task: Task;
  currentUser: User | null;
  assigneeLabel: string;
}

function UserTaskCard({ task, currentUser, assigneeLabel }: UserTaskCardProps) {
  const queryClient = useQueryClient();
  const canEdit =
    !!currentUser &&
    (task.assigneeId === currentUser.id ||
      (task.collaboratorIds ?? []).includes(currentUser.id));

  const [statusError, setStatusError] = useState<string | null>(null);

  const statusMut = useMutation({
    mutationFn: (next: TaskStatus) => userUpdateTask(task.id, { status: next }),
    onSuccess: () => {
      setStatusError(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
    },
    onError: (err) => {
      setStatusError(err instanceof Error ? err.message : "Cập nhật status thất bại");
    },
  });

  const projectLabel = task.projectName ?? task.projectId;
  const collaborators =
    task.collaborators && task.collaborators.length > 0
      ? task.collaborators.map((c) => c.fullName).join(", ")
      : null;

  return (
    <li className={at.taskCard}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Link
              to={`/tasks/${task.id}`}
              className="text-base font-semibold text-gray-900 hover:text-blue-600"
            >
              {task.title}
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <TaskPriorityLabel priority={task.priority} />
              <DeadlineTag deadline={task.deadline} />
              <AssigneeTag name={assigneeLabel} />
              {projectLabel && <ProjectTag name={projectLabel} />}
            </div>
            {collaborators && (
              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users className="size-3.5 shrink-0" />
                <span className="truncate">Cộng tác: {collaborators}</span>
              </p>
            )}
            {statusError && (
              <p className="text-xs text-destructive">{statusError}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canEdit ? (
              <select
                aria-label="Status"
                className={cn(at.select, "min-w-[130px]")}
                value={task.status}
                disabled={statusMut.isPending}
                onChange={(e) => {
                  const next = e.target.value as TaskStatus;
                  if (next !== task.status) statusMut.mutate(next);
                }}
              >
                <option value="Todo">Todo</option>
                <option value="InProgress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            ) : (
              <TaskStatusLabel status={task.status} />
            )}
            <Button
              variant="ghost"
              size="icon"
              className={at.iconBtn}
              asChild
              title="Xem chi tiết"
            >
              <Link to={`/tasks/${task.id}`} aria-label="Xem chi tiết">
                <Eye className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {canEdit && (
          <div className="border-t border-gray-100 pt-4">
            <UserResponseEditor task={task} compact defaultOpen={false} />
          </div>
        )}
      </div>
    </li>
  );
}
