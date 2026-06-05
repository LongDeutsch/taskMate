import type { Task, TaskPriority, TaskStatus, User } from "@/shared/types";
import type { TaskFormValues } from "../schemas/task-schema";
import { Loader2, Save, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoResizeTextarea } from "./auto-resize-textarea";
import { TaskDetailDrawer } from "./task-detail-overlay";
import { at } from "./admin-tasks-ui";

const statusOptions: TaskStatus[] = ["Todo", "InProgress", "Done"];
const priorityOptions: TaskPriority[] = ["Low", "Medium", "High"];

type ProjectOption = { id: string; name: string };

type AdminTaskFormDrawerProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  form: TaskFormValues;
  setForm: React.Dispatch<React.SetStateAction<TaskFormValues>>;
  formErrors: Partial<Record<keyof TaskFormValues, string>>;
  onSubmit: () => void;
  isPending: boolean;
  editingTask: Task | null;
  isSelfNoteForm: boolean;
  projects: ProjectOption[];
  users: User[];
  authUser: { id: string; fullName: string } | null;
  collaboratorOptions: User[];
  saveError?: string | null;
};

export function AdminTaskFormDrawer({
  open,
  onClose,
  mode,
  form,
  setForm,
  formErrors,
  onSubmit,
  isPending,
  editingTask,
  isSelfNoteForm,
  projects,
  users,
  authUser,
  collaboratorOptions,
  saveError,
}: AdminTaskFormDrawerProps) {
  const title =
    mode === "create"
      ? isSelfNoteForm
        ? "Note cho tôi"
        : "Tạo task mới"
      : "Chỉnh sửa task";
  const subtitle =
    mode === "create"
      ? isSelfNoteForm
        ? "Ghi chú cá nhân — không gửi thông báo cho người khác"
        : "Điền thông tin và gán cho thành viên"
      : "Cập nhật nội dung, trạng thái và phân công";

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="ghost" disabled={isPending} onClick={onClose}>
        Huỷ
      </Button>
      <Button type="button" className={at.primaryBtn} disabled={isPending} onClick={onSubmit}>
        {isPending ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Đang lưu...
          </>
        ) : (
          <>
            <Save className="size-4 mr-2" />
            {mode === "create" ? "Tạo task" : "Lưu thay đổi"}
          </>
        )}
      </Button>
    </div>
  );

  return (
    <TaskDetailDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={footer}
      panelClassName="w-full max-w-[min(100vw,900px)]"
    >
      <div className="space-y-8">
        {saveError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 [overflow-wrap:anywhere]"
            role="alert"
          >
            {saveError}
          </div>
        )}
        {isSelfNoteForm && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
            <StickyNote className="size-4 shrink-0" />
            Note cá nhân — chỉ bạn thấy trong danh sách note.
          </div>
        )}

        <section className="space-y-4">
          <h3 className={at.sectionTitle}>Thông tin chính</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {!isSelfNoteForm && (
              <div className="grid gap-2 lg:col-span-2">
                <Label className={at.label}>Project</Label>
                <select
                  className={at.select + " w-full"}
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                >
                  <option value="">Chọn project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {formErrors.projectId && (
                  <p className="text-sm text-destructive">{formErrors.projectId}</p>
                )}
              </div>
            )}
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="drawer-title" className={at.label}>
                Title
              </Label>
              <Input
                id="drawer-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Tiêu đề task"
                className="h-10 rounded-lg border-gray-200 shadow-sm"
              />
              {formErrors.title && (
                <p className="text-sm text-destructive">{formErrors.title}</p>
              )}
            </div>
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="drawer-description" className={at.label}>
                Description
              </Label>
              <div className={at.feedbackScroll}>
                <AutoResizeTextarea
                  id="drawer-description"
                  className="min-h-[120px] border-0 bg-transparent shadow-none focus:ring-0"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả công việc"
                  minRows={5}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={at.sectionTitle}>Trạng thái & phân công</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label className={at.label}>Status</Label>
              <select
                className={at.select + " w-full"}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))
                }
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === "InProgress" ? "In Progress" : s}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label className={at.label}>Priority</Label>
              <select
                className={at.select + " w-full"}
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))
                }
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="drawer-deadline" className={at.label}>
                Deadline
              </Label>
              <Input
                id="drawer-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="h-10 rounded-lg border-gray-200 shadow-sm"
              />
              {formErrors.deadline && (
                <p className="text-sm text-destructive">{formErrors.deadline}</p>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label className={at.label}>Assignee</Label>
              <select
                className={at.select + " w-full"}
                value={form.assigneeId ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    assigneeId: e.target.value || null,
                    collaboratorIds: (f.collaboratorIds ?? []).filter(
                      (id) => id !== e.target.value
                    ),
                  }))
                }
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
              <div className="grid gap-2 sm:col-span-2">
                <Label className={at.label}>Collaborators</Label>
                <select
                  className={at.select + " w-full"}
                  value={(form.collaboratorIds ?? [])[0] ?? ""}
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

        <section className="space-y-4">
          <h3 className={at.sectionTitle}>Feedback (PM)</h3>
          <div className={at.feedbackScroll}>
            <AutoResizeTextarea
              id="drawer-feedback"
              className="min-h-[100px] border-0 bg-transparent shadow-none focus:ring-0"
              value={form.feedback}
              onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))}
              placeholder="Ghi chú, nhận xét review..."
              minRows={4}
            />
          </div>
          {formErrors.feedback && (
            <p className="text-sm text-destructive">{formErrors.feedback}</p>
          )}
        </section>

        {mode === "edit" && editingTask && (
          <section className="space-y-2">
            <h3 className={at.sectionTitle}>Phản hồi từ người thực hiện</h3>
            <p className="text-xs text-gray-500">Chỉ đọc — do assignee gửi</p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
              {editingTask.userResponse?.trim()
                ? editingTask.userResponse
                : "Chưa có phản hồi."}
            </div>
          </section>
        )}
      </div>
    </TaskDetailDrawer>
  );
}
