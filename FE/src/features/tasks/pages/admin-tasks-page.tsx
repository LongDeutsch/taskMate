// File: src/features/tasks/pages/admin-tasks-page.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskStatus, TaskPriority } from "@/shared/types";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  syncTasksToSheets,
  getUsers,
  getProjects,
} from "@/shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { taskFormSchema, type TaskFormValues } from "../schemas/task-schema";
import { Plus, Pencil, Trash2 } from "lucide-react";

const statusOptions: TaskStatus[] = ["Todo", "InProgress", "Done"];
const priorityOptions: TaskPriority[] = ["Low", "Medium", "High"];

export function AdminTasksPage() {
  const queryClient = useQueryClient();
  const createEditorRef = useRef<HTMLDivElement | null>(null);
  const editEditorRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [sortBy, setSortBy] = useState<"deadline" | "createdAt" | "priority">("createdAt");
  const [projectIdFilter, setProjectIdFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [syncSheetsStatus, setSyncSheetsStatus] = useState<string>("");
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

  useEffect(() => {
    if (createOpen && createEditorRef.current) {
      createEditorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (editing && editEditorRef.current) {
      editEditorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [createOpen, editing?.id]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", "admin", { status, priorityFilter, sortBy, projectIdFilter, assigneeFilter }],
    queryFn: () =>
      getTasks({
        status: status || undefined,
        priority: priorityFilter || undefined,
        sortBy,
        projectId: projectIdFilter || undefined,
        assigneeId: assigneeFilter || undefined,
      }),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });
  const { data: projectTasksForMembers = [] } = useQuery({
    queryKey: ["tasks", "project-members", form.projectId],
    queryFn: () => (form.projectId ? getTasks({ projectId: form.projectId }) : Promise.resolve([])),
    enabled: !!form.projectId,
  });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setCreateOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditing(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const syncSheetsMutation = useMutation({
    mutationFn: syncTasksToSheets,
    onSuccess: (r) => {
      const errText = Array.isArray(r.errors) && r.errors.length > 0 ? `\nErrors: ${JSON.stringify(r.errors, null, 2)}` : "";
      setSyncSheetsStatus(`Synced: ${r.synced}/${r.total} | skipped: ${r.skipped} | failed: ${r.failed}${errText}`);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Sync failed";
      setSyncSheetsStatus(msg);
    },
  });

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

  function openEdit(task: Task) {
    setCreateOpen(false);
    setEditing(task);
    setForm({
      projectId: task.projectId,
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

  function validateAndSubmit(isCreate: boolean) {
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
    setFormErrors({});
    const data = result.data;
    const payload = {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      feedback: data.feedback ?? "",
      status: data.status,
      priority: data.priority,
      deadline: data.deadline,
      assigneeId: data.assigneeId || null,
      collaboratorIds: data.collaboratorIds ?? [],
    };
    if (isCreate) {
      createMutation.mutate(payload);
    } else if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    }
  }

  const assigneeName = (assigneeId: string | null) =>
    assigneeId ? users.find((u) => u.id === assigneeId)?.fullName ?? assigneeId : "—";
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;
  const projectMemberIds = new Set(
    projectTasksForMembers
      .map((t) => t.assigneeId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );
  if (form.assigneeId) projectMemberIds.add(form.assigneeId);
  const collaboratorOptions = users.filter(
    (u) => u.role === "USER" && projectMemberIds.has(u.id) && u.id !== form.assigneeId
  );

  const renderEditor = (isCreate: boolean) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{isCreate ? "New task" : "Edit task"}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isCreate) setCreateOpen(false);
            else setEditing(null);
            resetForm();
          }}
        >
          Cancel
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Project</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {formErrors.projectId && (
            <p className="text-sm text-destructive">{formErrors.projectId}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Task title"
          />
          {formErrors.title && (
            <p className="text-sm text-destructive">{formErrors.title}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="feedback">Feedback</Label>
          <textarea
            id="feedback"
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.feedback}
            onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))}
            placeholder="Notes, review comments, or stakeholder feedback"
          />
          {formErrors.feedback && (
            <p className="text-sm text-destructive">{formErrors.feedback}</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Status</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))
              }
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Priority</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))
              }
            >
              {priorityOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="deadline">Deadline</Label>
          <Input
            id="deadline"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          />
          {formErrors.deadline && (
            <p className="text-sm text-destructive">{formErrors.deadline}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label>Assignee</Label>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={form.assigneeId ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                assigneeId: e.target.value || null,
                collaboratorIds: (f.collaboratorIds ?? []).filter((id) => id !== e.target.value),
              }))
            }
          >
            <option value="">Unassigned</option>
            {users.filter((u) => u.role === "USER").map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.username})
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Collaborators</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={(form.collaboratorIds ?? [])[0] ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setForm((f) => ({
                ...f,
                collaboratorIds: v ? [v] : [],
              }));
            }}
          >
            <option value="">None</option>
            {collaboratorOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.username})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Same project members only. Default: None.
          </p>
        </div>
        <Button
          onClick={() => validateAndSubmit(isCreate)}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {isCreate ? "Create" : "Update"}
        </Button>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks (Admin)</h1>
          <p className="text-muted-foreground">Create, edit, delete and assign tasks</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!confirm("Sync all tasks to Google Sheets now?")) return;
              setSyncSheetsStatus("");
              syncSheetsMutation.mutate();
            }}
            disabled={syncSheetsMutation.isPending}
          >
            {syncSheetsMutation.isPending ? "Syncing..." : "Update Google Sheets"}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New task
          </Button>
        </div>
      </div>
      {syncSheetsStatus && (
        <Card>
          <CardContent className="py-3 text-sm">
            <div className="whitespace-pre-wrap break-words">{syncSheetsStatus}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and sort tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={projectIdFilter}
            onChange={(e) => setProjectIdFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="">All users</option>
            {users.filter((u) => u.role === "USER").map((u) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus((e.target.value || "") as TaskStatus | "")}
          >
            <option value="">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter((e.target.value || "") as TaskPriority | "")}
          >
            <option value="">All priorities</option>
            {priorityOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "deadline" | "createdAt" | "priority")}
          >
            <option value="deadline">Sort by deadline</option>
            <option value="createdAt">Sort by created</option>
            <option value="priority">Sort by priority</option>
          </select>
        </CardContent>
      </Card>

      {createOpen && <div ref={createEditorRef}>{renderEditor(true)}</div>}

      {tasks.length === 0 && !createOpen && !editing ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tasks yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="space-y-2">
              <Card className={editing?.id === task.id ? "ring-2 ring-primary/40" : undefined}>
                <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{task.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {projectName(task.projectId)} · {task.status} · {task.priority} · Due {task.deadline} ·{" "}
                      {assigneeName(task.assigneeId)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(task)}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={() => {
                        if (confirm("Delete this task?")) deleteMutation.mutate(task.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                      Xóa
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/tasks/${task.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {editing?.id === task.id && <div ref={editEditorRef}>{renderEditor(false)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
