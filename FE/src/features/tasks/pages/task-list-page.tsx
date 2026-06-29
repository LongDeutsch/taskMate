// File: src/features/tasks/pages/task-list-page.tsx
import { useMemo, useState } from "react";
import {
  DesktopFilterRow,
  FilterSheet,
  FilterSheetTrigger,
} from "@/app/components/filter-sheet";
import { PageHeader } from "@/app/components/page-header";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTasks } from "../hooks/use-tasks";
import {
  useTaskListFilters,
  type TaskListFilterValues,
} from "../hooks/use-task-list-filters";
import type { Task, TaskPriority, TaskStatus, User } from "@/shared/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getUsers, userUpdateTask } from "@/shared/api";
import {
  at,
  AssigneeTag,
  DeadlineTag,
  ProjectTag,
  TaskListSkeleton,
  TaskPriorityLabel,
  TaskStatusLabel,
} from "../components/admin-tasks-ui";
import { UserResponseEditor } from "../components/user-response-editor";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Calendar, Eye, Search, Users } from "lucide-react";

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

const sortSelectOptions = [
  { value: "deadline", label: "Deadline" },
  { value: "createdAt", label: "Mới nhất" },
  { value: "priority", label: "Priority" },
];

const STAFF_TASK_FILTER_DEFAULTS: TaskListFilterValues = {
  project: "",
  assignee: "",
  status: "Todo",
  priority: "",
  sort: "createdAt",
  search: "",
  noteOnly: false,
};

export function TaskListPage() {
  const { isAdmin, user } = useAuth();
  const {
    filters,
    setProject: setProjectId,
    setStatus,
    setPriority,
    setSort: setSortBy,
    setSearch,
    resetFilters,
    taskDetailPath,
  } = useTaskListFilters({ defaults: STAFF_TASK_FILTER_DEFAULTS });
  const {
    project: projectId,
    status,
    priority,
    sort: sortBy,
    search,
  } = filters;
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilterCount = [status, priority, projectId].filter(Boolean).length;

  const { data: tasks = [], isPending, isError } = useTasks({
    status: status || undefined,
    priority: priority || undefined,
    projectId: projectId || undefined,
    sortBy,
  });

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, search]);

  const { data: users = [] } = useQuery({
    queryKey: ["users", "task-list-assignee"],
    queryFn: getUsers,
    enabled: isAdmin,
  });

  const projectSelectOptions = useMemo(() => {
    const map = new Map(
      tasks
        .filter((t): t is Task & { projectId: string } => !!t.projectId)
        .map((t) => [t.projectId, t.projectName ?? t.projectId] as const)
    );
    return [
      { value: "", label: "Tất cả project" },
      ...Array.from(map.entries()).map(([id, name]) => ({ value: id, label: name })),
    ];
  }, [tasks]);

  const getAssigneeName = (task: Task) => {
    if (!task.assigneeId) return "Chưa gán";
    if (task.assigneeName != null && task.assigneeName !== "") return task.assigneeName;
    if (task.assigneeId === user?.id) return user.fullName;
    return users.find((u) => u.id === task.assigneeId)?.fullName ?? task.assigneeId;
  };

  if (isError) {
    return (
      <div className={`${at.surface} px-6 py-12 text-center text-sm text-red-600`}>
        Không tải được danh sách task. Vui lòng thử lại.
      </div>
    );
  }

  return (
    <div className={at.page}>
      <PageHeader
        title="My Tasks"
        subtitle={`Task được giao cho bạn · ${filteredTasks.length} task`}
        actions={
          isAdmin ? (
            <Button asChild variant="outline" className="h-11 border-gray-200">
              <Link to="/admin/tasks">Quản lý task (Admin)</Link>
            </Button>
          ) : undefined
        }
        mobileActions={
          isAdmin ? (
            <Button asChild variant="outline" className="h-11 w-full border-gray-200">
              <Link to="/admin/tasks">Quản lý task (Admin)</Link>
            </Button>
          ) : undefined
        }
      />

      <div className={at.surface}>
        <div className={at.toolbar}>
          <div className="relative w-full min-w-0 md:max-w-xs">
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
          <FilterSheetTrigger
            onClick={() => setFilterOpen(true)}
            activeCount={activeFilterCount}
          />
          <DesktopFilterRow>
            <SearchableSelect
              value={projectId}
              onChange={setProjectId}
              options={projectSelectOptions}
              searchPlaceholder="Tìm project..."
              ariaLabel="Lọc project"
            />
            <SearchableSelect
              searchable={false}
              value={status}
              onChange={(v) => setStatus(v as TaskStatus | "")}
              options={statusOptions}
              ariaLabel="Lọc status"
            />
            <SearchableSelect
              searchable={false}
              value={priority}
              onChange={(v) => setPriority(v as TaskPriority | "")}
              options={priorityOptions}
              ariaLabel="Lọc priority"
            />
            <SearchableSelect
              searchable={false}
              value={sortBy}
              onChange={(v) => setSortBy(v as "deadline" | "createdAt" | "priority")}
              options={sortSelectOptions}
              ariaLabel="Sắp xếp"
            />
          </DesktopFilterRow>
        </div>
      </div>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} onReset={resetFilters}>
        <div className="space-y-4 md:hidden">
          <SearchableSelect
            className="md:w-full"
            value={projectId}
            onChange={setProjectId}
            options={projectSelectOptions}
            searchPlaceholder="Tìm project..."
            ariaLabel="Lọc project"
          />
          <SearchableSelect
            className="md:w-full"
            searchable={false}
            value={status}
            onChange={(v) => setStatus(v as TaskStatus | "")}
            options={statusOptions}
            ariaLabel="Lọc status"
          />
          <SearchableSelect
            className="md:w-full"
            searchable={false}
            value={priority}
            onChange={(v) => setPriority(v as TaskPriority | "")}
            options={priorityOptions}
            ariaLabel="Lọc priority"
          />
          <SearchableSelect
            className="md:w-full"
            searchable={false}
            value={sortBy}
            onChange={(v) => setSortBy(v as "deadline" | "createdAt" | "priority")}
            options={sortSelectOptions}
            ariaLabel="Sắp xếp"
          />
        </div>
      </FilterSheet>

      {isPending ? (
        <TaskListSkeleton />
      ) : filteredTasks.length === 0 ? (
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
          {filteredTasks.map((task) => (
            <UserTaskCard
              key={task.id}
              task={task}
              currentUser={user}
              assigneeLabel={getAssigneeName(task)}
              detailPath={taskDetailPath(task.id)}
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
  detailPath: string;
}

function UserTaskCard({ task, currentUser, assigneeLabel, detailPath }: UserTaskCardProps) {
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
              to={detailPath}
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
                className={at.select}
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
              <Link to={detailPath} aria-label="Xem chi tiết">
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
