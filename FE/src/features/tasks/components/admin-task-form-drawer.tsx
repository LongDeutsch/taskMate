import type { Task, TaskPriority, TaskStatus, User } from "@/shared/types";
import type { TaskFormValues } from "../schemas/task-schema";
import { Loader2, Save, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoResizeTextarea } from "./auto-resize-textarea";
import { TaskDetailDrawer } from "./task-detail-overlay";
import { at } from "./admin-tasks-ui";
import { DatePicker } from "@/shared/components/date-picker";
import { MarkdownEditor } from "@/shared/components/markdown-editor";

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
      panelClassName="w-full max-w-[min(100vw,1120px)]"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:h-full">
        {saveError && (
          <div
            className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 [overflow-wrap:anywhere]"
            role="alert"
          >
            {saveError}
          </div>
        )}
        {isSelfNoteForm && (
          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
            <StickyNote className="size-4 shrink-0" />
            Note cá nhân — chỉ bạn thấy trong danh sách note.
          </div>
        )}

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(240px,1fr)] lg:gap-0">
          {/* Cột chính: tiêu đề + mô tả */}
          <div className="flex min-h-0 flex-col gap-3 lg:pr-5">
            <div className="grid shrink-0 gap-2">
              <Label htmlFor="drawer-title" className={at.label}>
                Tiêu đề
              </Label>
              <Input
                id="drawer-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="VD: Thiết kế banner homepage"
                className="h-10 rounded-lg shadow-sm"
                autoFocus
              />
              {formErrors.title && (
                <p className="text-sm text-destructive">{formErrors.title}</p>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <Label htmlFor="drawer-description" className={at.label}>
                Mô tả chi tiết
              </Label>
              <div className="min-h-[220px] flex-1 lg:min-h-0">
                <MarkdownEditor
                  id="drawer-description"
                  value={form.description}
                  disabled={isPending}
                  fillHeight
                  onChange={(val) => setForm((f) => ({ ...f, description: val }))}
                  placeholder="Mô tả công việc (hỗ trợ Markdown, checklist `- [ ]`, gạch đầu dòng `- `)..."
                  minRows={8}
                  className="h-full"
                />
              </div>
            </div>
          </div>

          {/* Cột phụ: metadata */}
          <aside className="flex flex-col gap-4 border-t border-border pt-4 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <h3 className={at.sectionTitle}>Phân công & trạng thái</h3>

            {!isSelfNoteForm && (
              <div className="grid gap-2">
                <Label className={at.label}>Project</Label>
                <select
                  className={at.select + " w-full"}
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                >
                  <option value="">Chọn dự án</option>
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

            <div className="grid gap-2">
              <Label className={at.label}>Trạng thái</Label>
              <select
                className={at.select + " w-full"}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))
                }
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === "Todo"
                      ? "Cần làm (Todo)"
                      : s === "InProgress"
                        ? "Đang làm (In Progress)"
                        : "Hoàn thành (Done)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label className={at.label}>Mức độ ưu tiên</Label>
              <select
                className={at.select + " w-full"}
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))
                }
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p === "Low"
                      ? "Thấp (Low)"
                      : p === "Medium"
                        ? "Trung bình (Medium)"
                        : "Cao (High)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drawer-deadline" className={at.label}>
                Hạn chót
              </Label>
              <DatePicker
                id="drawer-deadline"
                value={form.deadline}
                onChange={(val) => setForm((f) => ({ ...f, deadline: val }))}
                placeholder="Chọn hạn chót..."
              />
              {formErrors.deadline && (
                <p className="text-sm text-destructive">{formErrors.deadline}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label className={at.label}>Người thực hiện</Label>
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
              <div className="grid gap-2">
                <Label className={at.label}>Người phối hợp</Label>
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

            <div className="grid gap-2 border-t border-border pt-4">
              <Label className={at.label}>Feedback (PM)</Label>
              <div className={at.feedbackScroll}>
                <AutoResizeTextarea
                  id="drawer-feedback"
                  className="min-h-[88px] border-0 bg-transparent shadow-none focus:ring-0"
                  value={form.feedback}
                  onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))}
                  placeholder="Ghi chú, nhận xét review..."
                  minRows={3}
                />
              </div>
              {formErrors.feedback && (
                <p className="text-sm text-destructive">{formErrors.feedback}</p>
              )}
            </div>

            {mode === "edit" && editingTask && (
              <div className="grid gap-2 border-t border-border pt-4">
                <Label className={at.label}>Phản hồi người thực hiện</Label>
                <p className="text-[11px] text-muted-foreground">Chỉ đọc — do assignee gửi</p>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-emerald-200/60 bg-emerald-50/40 px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  {editingTask.userResponse?.trim()
                    ? editingTask.userResponse
                    : "Chưa có phản hồi."}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </TaskDetailDrawer>
  );
}
