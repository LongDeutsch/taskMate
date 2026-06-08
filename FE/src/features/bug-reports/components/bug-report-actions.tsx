import type { BugReport } from "@/shared/types";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { at } from "@/features/tasks/components/admin-tasks-ui";

export function canEditBug(bug: BugReport, userId: string | undefined) {
  return !!userId && bug.userId === userId;
}

export function canDeleteBug(isAdmin: boolean) {
  return isAdmin;
}

type BugReportIconActionsProps = {
  bug: BugReport;
  userId: string | undefined;
  isAdmin: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deletePending?: boolean;
};

export function BugReportIconActions({
  bug,
  userId,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  deletePending,
}: BugReportIconActionsProps) {
  const showEdit = canEditBug(bug, userId);
  const showDelete = canDeleteBug(isAdmin);

  return (
    <div className="flex shrink-0 items-center gap-1">
      {showEdit && (
        <Button
          variant="ghost"
          size="icon"
          className={at.iconBtnPrimary}
          title="Chỉnh sửa"
          aria-label="Chỉnh sửa bug"
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
      )}
      {showDelete && (
        <Button
          variant="ghost"
          size="icon"
          className={at.iconBtnDanger}
          title="Xóa"
          aria-label="Xóa bug"
          disabled={deletePending}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className={at.iconBtn}
        title="Xem chi tiết"
        aria-label="Xem chi tiết bug"
        onClick={onView}
      >
        <Eye className="size-4" />
      </Button>
    </div>
  );
}
