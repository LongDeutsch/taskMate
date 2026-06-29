// File: src/features/tasks/pages/admin-tasks-page.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { Task, TaskStatus, TaskPriority } from "@/shared/types";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  deleteAllTasks,
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
  TaskListSkeleton,
  TaskPriorityLabel,
  TaskStatusLabel,
} from "../components/admin-tasks-ui";
import { AdminTaskFormDrawer } from "../components/admin-task-form-drawer";
import {
  Eye,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { PageHeader } from "@/app/components/page-header";
import {
  DesktopFilterRow,
  FilterSheet,
  FilterSheetTrigger,
} from "@/app/components/filter-sheet";
import { FloatingActionButton } from "@/app/components/floating-action-button";
import { OverflowActionsMenu } from "@/app/components/overflow-actions-menu";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useTaskListFilters,
  type TaskListFilterValues,
} from "../hooks/use-task-list-filters";

const statusSelectOptions = [
  { value: "", label: "Tất cả status" },
  { value: "Todo", label: "Todo" },
  { value: "InProgress", label: "In Progress" },
  { value: "Done", label: "Done" },
];
const prioritySelectOptions = [
  { value: "", label: "Tất cả priority" },
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];
const sortSelectOptions = [
  { value: "createdAt", label: "Mới nhất" },
  { value: "deadline", label: "Deadline" },
  { value: "priority", label: "Priority" },
];

const ADMIN_TASK_FILTER_DEFAULTS: TaskListFilterValues = {
  project: "",
  assignee: "",
  status: "Todo",
  priority: "",
  sort: "createdAt",
  search: "",
  noteOnly: false,
};

export function AdminTasksPage() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const {
    filters,
    setProject: setProjectIdFilter,
    setAssignee: setAssigneeFilter,
    setStatus,
    setPriority: setPriorityFilter,
    setSort: setSortBy,
    setSearch,
    setNoteOnly: setOnlyMyNotes,
    resetFilters,
    taskDetailPath,
  } = useTaskListFilters({
    defaults: ADMIN_TASK_FILTER_DEFAULTS,
    includeAssignee: true,
    includeNoteOnly: true,
  });
  const {
    project: projectIdFilter,
    assignee: assigneeFilter,
    status,
    priority: priorityFilter,
    sort: sortBy,
    search,
    noteOnly: onlyMyNotes,
  } = filters;
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeFilterCount = [
    status,
    priorityFilter,
    projectIdFilter,
    assigneeFilter,
    onlyMyNotes,
  ].filter(Boolean).length;

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const effectiveAssigneeFilter = onlyMyNotes && authUser ? authUser.id : assigneeFilter || undefined;

  const { data: tasks = [], isPending } = useQuery({
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
      }),
    placeholderData: keepPreviousData,
  });

  const isSelfNote = (task: Task) => !!authUser && task.assigneeId === authUser.id;

  const visibleTasks = useMemo(() => {
    let list =
      onlyMyNotes || !authUser
        ? tasks
        : tasks.filter((t) => t.assigneeId !== authUser.id);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return list;
  }, [tasks, onlyMyNotes, search, authUser]);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const projectSelectOptions = useMemo(
    () => [
      { value: "", label: "Tất cả project" },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects]
  );

  const assigneeSelectOptions = useMemo(
    () => [
      { value: "", label: "Tất cả assignee" },
      ...users
        .filter((u) => u.role === "USER" && u.roleLabel !== "HR")
        .map((u) => ({ value: u.id, label: u.fullName })),
    ],
    [users]
  );

  const filterFields = (
    <>
      <div className="space-y-2">
        <label className={at.label}>Project</label>
        <SearchableSelect
          className="md:w-full"
          value={projectIdFilter}
          onChange={setProjectIdFilter}
          options={projectSelectOptions}
          searchPlaceholder="Tìm project..."
          ariaLabel="Lọc project"
        />
      </div>
      <div className="space-y-2">
        <label className={at.label}>Assignee</label>
        <SearchableSelect
          className="md:w-full"
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          options={assigneeSelectOptions}
          searchPlaceholder="Tìm assignee..."
          ariaLabel="Lọc assignee"
          disabled={onlyMyNotes}
        />
      </div>
      <div className="space-y-2">
        <label className={at.label}>Status</label>
        <SearchableSelect
          className="md:w-full"
          searchable={false}
          value={status}
          onChange={(v) => setStatus(v as TaskStatus | "")}
          options={statusSelectOptions}
          ariaLabel="Lọc status"
        />
      </div>
      <div className="space-y-2">
        <label className={at.label}>Priority</label>
        <SearchableSelect
          className="md:w-full"
          searchable={false}
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as TaskPriority | "")}
          options={prioritySelectOptions}
          ariaLabel="Lọc priority"
        />
      </div>
      <div className="space-y-2">
        <label className={at.label}>Sắp xếp</label>
        <SearchableSelect
          className="md:w-full"
          searchable={false}
          value={sortBy}
          onChange={(v) => setSortBy(v as "deadline" | "createdAt" | "priority")}
          options={sortSelectOptions}
          ariaLabel="Sắp xếp"
        />
      </div>
      <FilterChip
        active={onlyMyNotes}
        onClick={() => setOnlyMyNotes(!onlyMyNotes)}
        className="w-full justify-center"
      >
        <StickyNote className="size-4" />
        {onlyMyNotes ? "Note của tôi" : "Chỉ note"}
      </FilterChip>
    </>
  );

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDrawer();
    },
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : "Không tạo được task.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      updateTask(id, data),
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDrawer();
    },
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : "Không lưu được task.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "trash"] });
    },
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
    setSaveError(null);
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

  const desktopActions = (
    <>
      <Button
        variant="outline"
        className="h-11 border-red-200 text-red-700 hover:bg-red-50"
        disabled={deleteAllMutation.isPending}
        onClick={() => {
          if (
            !confirm(
              "Xóa toàn bộ task trong hệ thống? Task sẽ vào thùng rác 5 ngày."
            )
          ) {
            return;
          }
          deleteAllMutation.mutate();
        }}
      >
        <Trash2 className="size-4 mr-2" />
        Xóa tất cả
      </Button>
      <Button
        variant="outline"
        className="h-11 border-amber-200 text-amber-800 hover:bg-amber-50"
        onClick={openSelfNote}
      >
        <StickyNote className="size-4 mr-2" />
        Note cho tôi
      </Button>
      <Button className={cn(at.primaryBtn, "h-11")} onClick={openCreate}>
        <Plus className="size-4 mr-2" />
        Task mới
      </Button>
    </>
  );

  return (
    <div className={at.page}>
      <PageHeader
        title="Tasks"
        subtitle={`Tạo, chỉnh sửa và quản lý task — ${visibleTasks.length} hiển thị`}
        actions={desktopActions}
        mobileActions={
          <OverflowActionsMenu
            actions={[
              {
                label: "Note cho tôi",
                onClick: openSelfNote,
              },
              {
                label: "Xóa tất cả",
                destructive: true,
                disabled: deleteAllMutation.isPending,
                onClick: () => {
                  if (
                    !confirm(
                      "Xóa toàn bộ task trong hệ thống? Task sẽ vào thùng rác 5 ngày."
                    )
                  ) {
                    return;
                  }
                  deleteAllMutation.mutate();
                },
              },
            ]}
          />
        }
      />

      <FloatingActionButton
        label="Task mới"
        icon={<Plus className="size-6" />}
        onClick={openCreate}
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
              value={projectIdFilter}
              onChange={setProjectIdFilter}
              options={projectSelectOptions}
              searchPlaceholder="Tìm project..."
              ariaLabel="Lọc project"
            />
            <SearchableSelect
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={assigneeSelectOptions}
              searchPlaceholder="Tìm assignee..."
              ariaLabel="Lọc assignee"
              disabled={onlyMyNotes}
            />
            <SearchableSelect
              searchable={false}
              value={status}
              onChange={(v) => setStatus(v as TaskStatus | "")}
              options={statusSelectOptions}
              ariaLabel="Lọc status"
            />
            <SearchableSelect
              searchable={false}
              value={priorityFilter}
              onChange={(v) => setPriorityFilter(v as TaskPriority | "")}
              options={prioritySelectOptions}
              ariaLabel="Lọc priority"
            />
            <SearchableSelect
              searchable={false}
              value={sortBy}
              onChange={(v) => setSortBy(v as "deadline" | "createdAt" | "priority")}
              options={sortSelectOptions}
              ariaLabel="Sắp xếp"
            />
            <FilterChip active={onlyMyNotes} onClick={() => setOnlyMyNotes(!onlyMyNotes)}>
              <StickyNote className="size-4" />
              {onlyMyNotes ? "Note của tôi" : "Chỉ note"}
            </FilterChip>
          </DesktopFilterRow>
        </div>
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
      >
        {filterFields}
      </FilterSheet>

      {isPending ? (
        <TaskListSkeleton />
      ) : visibleTasks.length === 0 ? (
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
                        to={taskDetailPath(task.id)}
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
                      <Link to={taskDetailPath(task.id)} aria-label="Xem chi tiết">
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
        saveError={saveError}
      />
    </div>
  );
}
