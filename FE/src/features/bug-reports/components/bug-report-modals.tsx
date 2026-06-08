import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { BugReport, BugReportStatus } from "@/shared/types";
import { formatBugStatus } from "@/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaskDetailModal } from "@/features/tasks/components/task-detail-overlay";
import { BugStatusBadge } from "./bug-report-ui";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

type BugViewModalProps = {
  open: boolean;
  bug: BugReport | null;
  isAdmin: boolean;
  onClose: () => void;
  onStatusChange?: (status: BugReportStatus) => void;
  statusPending?: boolean;
};

export function BugViewModal({
  open,
  bug,
  isAdmin,
  onClose,
  onStatusChange,
  statusPending,
}: BugViewModalProps) {
  if (!bug) return null;

  return (
    <TaskDetailModal
      open={open}
      onClose={onClose}
      title="Chi tiết bug"
      footer={
        isAdmin && onStatusChange ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Label className="sr-only" htmlFor="bug-view-status">
              Trạng thái
            </Label>
            <select
              id="bug-view-status"
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
              value={bug.status}
              disabled={statusPending}
              onChange={(e) => onStatusChange(e.target.value as BugReportStatus)}
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{bug.title}</h3>
          <BugStatusBadge status={bug.status} />
        </div>
        <dl className="grid gap-2 text-sm text-gray-600">
          <div>
            <dt className="font-medium text-gray-700">Người gửi</dt>
            <dd>{bug.userName}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Trạng thái</dt>
            <dd>{formatBugStatus(bug.status)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Tạo lúc</dt>
            <dd>{formatDate(bug.createdAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Cập nhật</dt>
            <dd>{formatDate(bug.updatedAt)}</dd>
          </div>
        </dl>
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">Nội dung</p>
          <p className="whitespace-pre-wrap text-sm text-gray-600 [overflow-wrap:anywhere]">
            {bug.content}
          </p>
        </div>
      </div>
    </TaskDetailModal>
  );
}

type BugEditModalProps = {
  open: boolean;
  bug: BugReport | null;
  onClose: () => void;
  onSave: (data: { title: string; content: string }) => void;
  isPending: boolean;
  error?: string | null;
};

export function BugEditModal({
  open,
  bug,
  onClose,
  onSave,
  isPending,
  error,
}: BugEditModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (bug && open) {
      setTitle(bug.title);
      setContent(bug.content);
    }
  }, [bug, open]);

  if (!bug) return null;

  return (
    <TaskDetailModal
      open={open}
      onClose={onClose}
      title="Chỉnh sửa bug"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" disabled={isPending} onClick={onClose}>
            Huỷ
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={isPending}
            onClick={() => onSave({ title: title.trim(), content: content.trim() })}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu thay đổi"
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="edit-bug-title">Tiêu đề</Label>
          <Input
            id="edit-bug-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-bug-content">Nội dung</Label>
          <Textarea
            id="edit-bug-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            disabled={isPending}
          />
        </div>
      </div>
    </TaskDetailModal>
  );
}
