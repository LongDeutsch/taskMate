// File: src/features/tasks/pages/admin-tasks-page.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskStatus, TaskPriority } from "@/shared/types";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getUsers,
  getProjects,
} from "@/shared/api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { taskFormSchema, type TaskFormValues } from "../schemas/task-schema";
import {
  at,
  AssigneeTag,
  DeadlineTag,
  FilterChip,
  ProjectTag,
  SelfNoteBadge,
  TaskPriorityLabel,
  TaskStatusLabel,
} from "../components/admin-tasks-ui";
import { AdminTaskFormDrawer } from "../components/admin-task-form-drawer";
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const statusOptions: TaskStatus[] = ["Todo", "InProgress", "Done"];
const priorityOptions: TaskPriority[] = ["Low", "Medium", "High"];

export function AdminTasksPage() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [sortBy, setSortBy] = useState<"deadline" | "createdAt" | "priority">("createdAt");
  const [projectIdFilter, setProjectIdFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [onlyMyNotes, setOnlyMyNotes] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<TaskFormValues>({
    projectId: "",
    title: "",
    description: "",
    status: "Todo",
    priority: "Medium",
    deadline: "",
    assigneeId: null,
    collaboratorIds: [],
    feedback: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TaskFormValues, string>>>({});

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const effectiveAssigneeFilter = onlyMyNotes && authUser ? authUser.id : assigneeFilter || undefined;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [
      "tasks",
      "admin",
      {
        status,
        priorityFilter,
        sortBy,
        projectIdFilter,
        assigneeFilter,
        onlyMyNotes,
        search,
        me: authUser?.id,
      },
    ],
    queryFn: () =>
      getTasks({
        status: status || undefined,
        priority: priorityFilter || undefined,
        sortBy,
        projectId: projectIdFilter || undefined,
        assigneeId: effectiveAssigneeFilter,
        search: search.trim() || undefined,
      }),
  });

  const isSelfNote = (task: Task) => !!authUser && task.assigneeId === authUser.id;
  const visibleTasks = onlyMyNotes ? tasks : tasks.filter((t) => !isSelfNote(t));

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDrawer();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDrawer();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const drawerOpen = createOpen || !!editing;
  const isSelfNoteForm = !!authUser && form.assigneeId === authUser.id;
  const formPending = createMutation.isPending || updateMutation.isPending;

  function resetForm() {
    setForm({
      projectId: projects[0]?.id ?? "",
      title: "",
      description: "",
      status: "Todo",
      priority: "Medium",
      deadline: "",
      assigneeId: null,
      collaboratorIds: [],
      feedback: "",
    });
    setFormErrors({});
  }

  function closeDrawer() {
    setCreateOpen(false);
    setEditing(null);
    resetForm();
  }

  function openCreate() {
    setEditing(null);
    setCreateOpen(true);
    setForm({
      projectId: projects[0]?.id ?? "",
      title: "",
      description: "",
      status: "Todo",
      priority: "Medium",
      deadline: new Date().toISOString().slice(0, 10),
      assigneeId: null,
      collaboratorIds: [],
      feedback: "",
    });
    setFormErrors({});
  }

  function openSelfNote() {
    if (!authUser) return;
    setEditing(null);
    setCreateOpen(true);
    setForm({
      projectId: projects[0]?.id ?? "",
      title: "",
      description: "",
      status: "Todo",
      priority: "Medium",
      deadline: new Date().toISOString().slice(0, 10),
      assigneeId: authUser.id,
      collaboratorIds: [],
      feedback: "",
    });
    setFormErrors({});
  }

  function openEdit(task: Task) {
    setCreateOpen(false);
    setEditing(task);
    setForm({
      projectId: task.projectId ?? "",
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      assigneeId: task.assigneeId,
      collaboratorIds: task.collaboratorIds ?? [],
      feedback: task.feedback ?? "",
    });
    setFormErrors({});
  }

  function validateAndSubmit() {
    const result = taskFormSchema.safeParse(form);
    if (!result.success) {
      const errs: Partial<Record<keyof TaskFormValues, string>> = {};
      result.error.issues.forEach((issue) => {
        const k = issue.path[0] as keyof TaskFormValues;
        if (k) errs[k] = issue.message;
      });
      setFormErrors(errs);
      return;
    }
    const data = result.data;
    const selfNote = !!authUser && data.assigneeId === authUser.id;
    if (!selfNote && !data.projectId) {
      setFormErrors({ projectId: "Project is required" });
      return;
    }
    setFormErrors({});
    const payload = {
      projectId: data.projectId || null,
      title: data.title,
      description: data.description,
      feedback: data.feedback ?? "",
      status: data.status,
      priority: data.priority,
      deadline: data.deadline,
      assigneeId: data.assigneeId || null,
      collaboratorIds: data.collaboratorIds ?? [],
    };
    if (createOpen) {
      createMutation.mutate(payload);
    } else if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    }
  }

  const assigneeName = (assigneeId: string | null) => {
    if (!assigneeId) return "Chưa gán";
    if (authUser && assigneeId === authUser.id) return authUser.fullName;
    return users.find((u) => u.id === assigneeId)?.fullName ?? assigneeId;
  };

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;

  const collaboratorOptions = users.filter(
    (u) =>
      u.role === "USER" &&
      u.roleLabel !== "HR" &&
      !u.disabled &&
      !u.deletedAt &&
      u.id !== form.assigneeId
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={at.page}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={at.pageTitle}>Tasks</h1>
          <p className={at.pageSubtitle}>
            Tạo, chỉnh sửa và quản lý task — {visibleTasks.length} hiển thị
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={openSelfNote}
            className="border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
          >
            <StickyNote className="size-4 mr-2" />
            Note cho tôi
          </Button>
          <Button className={at.primaryBtn} onClick={openCreate}>
            <Plus className="size-4 mr-2" />
            Task mới
          </Button>
        </div>
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
              value={projectIdFilter}
              onChange={(e) => setProjectIdFilter(e.target.value)}
              aria-label="Lọc project"
            >
              <option value="">Tất cả project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className={at.select}
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Lọc assignee"
              disabled={onlyMyNotes}
            >
              <option value="">Tất cả assignee</option>
              {users
                .filter((u) => u.role === "USER" && u.roleLabel !== "HR")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
            </select>
            <select
              className={at.select}
              value={status}
              onChange={(e) => setStatus((e.target.value || "") as TaskStatus | "")}
              aria-label="Lọc status"
            >
              <option value="">Status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "InProgress" ? "In Progress" : s}
                </option>
              ))}
            </select>
            <select
              className={at.select}
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter((e.target.value || "") as TaskPriority | "")
              }
              aria-label="Lọc priority"
            >
              <option value="">Priority</option>
              {priorityOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
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
              <option value="createdAt">Mới nhất</option>
              <option value="deadline">Deadline</option>
              <option value="priority">Priority</option>
            </select>
            <FilterChip active={onlyMyNotes} onClick={() => setOnlyMyNotes((v) => !v)}>
              <StickyNote className="size-4" />
              {onlyMyNotes ? "Note của tôi" : "Chỉ note"}
            </FilterChip>
          </div>
        </div>
      </div>

      {visibleTasks.length === 0 ? (
        <div className={`${at.surface} px-6 py-16 text-center`}>
          <p className="text-sm text-gray-500">
            {onlyMyNotes
              ? 'Chưa có note cá nhân. Bấm "Note cho tôi" để tạo.'
              : search.trim()
                ? "Không tìm thấy task phù hợp."
                : 'Chưa có task. Bấm "Task mới" để bắt đầu.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleTasks.map((task) => {
            const selfNote = isSelfNote(task);
            const isActive = editing?.id === task.id;
            return (
              <li
                key={task.id}
                className={cn(
                  at.taskCard,
                  isActive && at.taskCardActive,
                  selfNote && at.taskCardNote
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="text-base font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {task.title}
                      </Link>
                      {selfNote && <SelfNoteBadge />}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {task.projectId && (
                        <ProjectTag name={projectName(task.projectId)} />
                      )}
                      <TaskStatusLabel status={task.status} />
                      <TaskPriorityLabel priority={task.priority} />
                      <DeadlineTag deadline={task.deadline} />
                      <AssigneeTag name={assigneeName(task.assigneeId)} />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 sm:pt-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={at.iconBtnPrimary}
                      onClick={() => openEdit(task)}
                      title="Chỉnh sửa"
                      aria-label="Chỉnh sửa"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={at.iconBtnDanger}
                      title="Xóa"
                      aria-label="Xóa"
                      onClick={() => {
                        if (confirm("Xóa task này?")) deleteMutation.mutate(task.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
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
              </li>
            );
          })}
        </ul>
      )}

      <AdminTaskFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        mode={createOpen ? "create" : "edit"}
        form={form}
        setForm={setForm}
        formErrors={formErrors}
        onSubmit={validateAndSubmit}
        isPending={formPending}
        editingTask={editing}
        isSelfNoteForm={isSelfNoteForm}
        projects={projects}
        users={users}
        authUser={authUser ? { id: authUser.id, fullName: authUser.fullName } : null}
        collaboratorOptions={collaboratorOptions}
      />
    </div>
  );
}
