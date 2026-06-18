import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getProjects, getUsers, updateTask } from "@/shared/api";
import type { Task, TaskPriority, TaskStatus } from "@/shared/types";
import { TaskDetailDrawer } from "./task-detail-overlay";
import { td } from "./task-detail-ui";

type AdminTaskEditDrawerProps = {
  open: boolean;
  onClose: () => void;
  task: Task;
};

function sameIdList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

export function AdminTaskEditDrawer({ open, onClose, task }: AdminTaskEditDrawerProps) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
    enabled: open,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: open,
  });

  const initial = useMemo(
    () => ({
      projectId: task.projectId ?? "",
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      assigneeId: task.assigneeId ?? null,
      collaboratorIds: task.collaboratorIds ?? [],
    }),
    [
      task.id,
      task.projectId,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.deadline,
      task.assigneeId,
      task.collaboratorIds,
    ]
  );

  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial);
      setError(null);
    }
  }, [open, initial]);

  const isSelfNoteForm = !!authUser && form.assigneeId === authUser.id;

  const collaboratorOptions = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === "USER" &&
          u.roleLabel !== "HR" &&
          !u.disabled &&
          !u.deletedAt &&
          u.id !== form.assigneeId
      ),
    [users, form.assigneeId]
  );

  const dirty = useMemo(
    () =>
      form.projectId !== initial.projectId ||
      form.title !== initial.title ||
      form.description !== initial.description ||
      form.status !== initial.status ||
      form.priority !== initial.priority ||
      form.deadline !== initial.deadline ||
      form.assigneeId !== initial.assigneeId ||
      !sameIdList(form.collaboratorIds, initial.collaboratorIds),
    [form, initial]
  );

  const mut = useMutation({
    mutationFn: (data: Partial<Task>) => updateTask(task.id, data),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      onClose();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Cập nhật thất bại"),
  });

  function save() {
    if (!form.title.trim()) {
      setError("Title không được trống");
      return;
    }
    if (!form.deadline) {
      setError("Deadline không được trống");
      return;
    }
    const payload: Partial<Task> = {};
    if (form.projectId !== initial.projectId) {
      payload.projectId = form.projectId || null;
    }
    if (form.title !== initial.title) payload.title = form.title;
    if (form.description !== initial.description) payload.description = form.description;
    if (form.status !== initial.status) payload.status = form.status;
    if (form.priority !== initial.priority) payload.priority = form.priority;
    if (form.deadline !== initial.deadline) payload.deadline = form.deadline;
    if (form.assigneeId !== initial.assigneeId) {
      payload.assigneeId = form.assigneeId;
    }
    if (!sameIdList(form.collaboratorIds, initial.collaboratorIds)) {
      payload.collaboratorIds = form.collaboratorIds;
    }
    mut.mutate(payload);
  }

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" disabled={mut.isPending} onClick={onClose}>
        Huỷ
      </Button>
      <Button
        type="button"
        className={td.primaryBtn}
        disabled={!dirty || mut.isPending}
        onClick={save}
      >
        {mut.isPending ? (
          <>
            <Loader2 className="size-4 mr-1 animate-spin" />
            Đang lưu...
          </>
        ) : (
          <>
            <Save className="size-4 mr-1" />
            Lưu thay đổi
          </>
        )}
      </Button>
    </div>
  );

  return (
    <TaskDetailDrawer
      open={open}
      onClose={onClose}
      title="Cập nhật task"
      subtitle="Chỉnh sửa trạng thái, phân công và nội dung task"
      footer={footer}
      panelClassName="w-full max-w-[min(100vw,900px)]"
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <h3 className={td.sectionTitle}>Trạng thái & thời hạn</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="drawer-status" className="text-blue-700">
                Status
              </Label>
              <select
                id="drawer-status"
                className={td.select}
                value={form.status}
                disabled={mut.isPending}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))
                }
              >
                <option value="Todo">Todo</option>
                <option value="InProgress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="drawer-priority" className="text-blue-700">
                Priority
              </Label>
              <select
                id="drawer-priority"
                className={td.select}
                value={form.priority}
                disabled={mut.isPending}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))
                }
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="drawer-deadline" className="text-blue-700">
                Deadline
              </Label>
              <Input
                id="drawer-deadline"
                type="date"
                value={form.deadline}
                disabled={mut.isPending}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="h-10 rounded-lg border-gray-200 bg-white shadow-sm"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={td.sectionTitle}>Nội dung task</h3>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="drawer-project" className="text-blue-700">
                Project
              </Label>
              <select
                id="drawer-project"
                className={td.select}
                value={form.projectId}
                disabled={mut.isPending}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
              >
                <option value="">— Không thuộc project (note cá nhân)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="drawer-title" className="text-blue-700">
                Title
              </Label>
              <Input
                id="drawer-title"
                value={form.title}
                disabled={mut.isPending}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="h-10 rounded-lg border-gray-200 bg-white shadow-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="drawer-description" className="text-blue-700">
                Description
              </Label>
              <textarea
                id="drawer-description"
                className="min-h-[160px] w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                value={form.description}
                disabled={mut.isPending}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={6}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={td.sectionTitle}>Phân công</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="drawer-assignee" className="text-blue-700">
                Assignee
              </Label>
              <select
                id="drawer-assignee"
                className={td.select}
                value={form.assigneeId ?? ""}
                disabled={mut.isPending}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setForm((f) => ({
                    ...f,
                    assigneeId: v,
                    collaboratorIds: (f.collaboratorIds ?? []).filter((id) => id !== v),
                  }));
                }}
              >
                <option value="">Chưa gán</option>
                {authUser && (
                  <option value={authUser.id}>
                    Tôi — Note cá nhân ({authUser.fullName})
                  </option>
                )}
                {users
                  .filter((u) => u.role === "USER" && u.roleLabel !== "HR")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.username})
                    </option>
                  ))}
              </select>
            </div>
            {!isSelfNoteForm && (
              <div className="grid gap-2">
                <Label htmlFor="drawer-collaborator" className="text-blue-700">
                  Collaborators
                </Label>
                <select
                  id="drawer-collaborator"
                  className={td.select}
                  value={(form.collaboratorIds ?? [])[0] ?? ""}
                  disabled={mut.isPending}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      collaboratorIds: v ? [v] : [],
                    }));
                  }}
                >
                  <option value="">Không có</option>
                  {collaboratorOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.username})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </TaskDetailDrawer>
  );
}
