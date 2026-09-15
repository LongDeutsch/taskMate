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
import { DatePicker } from "@/shared/components/date-picker";
import { MarkdownEditor } from "@/shared/components/markdown-editor";

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
      panelClassName="w-full max-w-[min(100vw,1120px)]"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:h-full">
        {error && (
          <p className="shrink-0 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(240px,1fr)] lg:gap-0">
          <div className="flex min-h-0 flex-col gap-3 lg:pr-5">
            <div className="grid shrink-0 gap-2">
              <Label htmlFor="drawer-title" className="font-medium text-foreground">
                Tiêu đề
              </Label>
              <Input
                id="drawer-title"
                value={form.title}
                disabled={mut.isPending}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="h-10 rounded-lg border-border bg-background text-foreground shadow-sm"
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <Label htmlFor="drawer-description" className="font-medium text-foreground">
                Mô tả chi tiết
              </Label>
              <div className="min-h-[220px] flex-1 lg:min-h-0">
                <MarkdownEditor
                  id="drawer-description"
                  value={form.description}
                  disabled={mut.isPending}
                  fillHeight
                  onChange={(val) => setForm((f) => ({ ...f, description: val }))}
                  placeholder="Mô tả công việc (hỗ trợ Markdown, checklist `- [ ]`, gạch đầu dòng `- `)..."
                  minRows={8}
                  className="h-full"
                />
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4 border-t border-border pt-4 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <h3 className={td.sectionTitle}>Phân công & trạng thái</h3>

            <div className="grid gap-2">
              <Label htmlFor="drawer-project" className="font-medium text-foreground">
                Dự án
              </Label>
              <select
                id="drawer-project"
                className={td.select}
                value={form.projectId}
                disabled={mut.isPending}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
              >
                <option value="">— Không thuộc dự án (note cá nhân)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-status" className="font-medium text-foreground">
                Trạng thái
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
                <option value="Todo">Cần làm (Todo)</option>
                <option value="InProgress">Đang làm (In Progress)</option>
                <option value="Done">Hoàn thành (Done)</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-priority" className="font-medium text-foreground">
                Mức độ ưu tiên
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
                <option value="Low">Thấp (Low)</option>
                <option value="Medium">Trung bình (Medium)</option>
                <option value="High">Cao (High)</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-deadline" className="font-medium text-foreground">
                Hạn chót
              </Label>
              <DatePicker
                id="drawer-deadline"
                value={form.deadline}
                disabled={mut.isPending}
                onChange={(val) => setForm((f) => ({ ...f, deadline: val }))}
                placeholder="Chọn hạn chót..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-assignee" className="font-medium text-foreground">
                Người thực hiện
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
                <Label htmlFor="drawer-collaborator" className="font-medium text-foreground">
                  Người phối hợp
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
          </aside>
        </div>
      </div>
    </TaskDetailDrawer>
  );
}
