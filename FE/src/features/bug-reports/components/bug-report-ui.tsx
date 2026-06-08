import type { BugReportStatus } from "@/shared/types";
import { formatBugStatus } from "@/shared/types";
import { cn } from "@/shared/lib/utils";

export function BugStatusBadge({ status }: { status: BugReportStatus }) {
  const styles: Record<BugReportStatus, string> = {
    todo: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    in_progress: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    done: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[status]
      )}
    >
      {formatBugStatus(status)}
    </span>
  );
}

const BUG_STATUS_OPTIONS: BugReportStatus[] = ["todo", "in_progress", "done"];

export function BugStatusSelect({
  value,
  onChange,
  disabled,
  id,
  className,
}: {
  value: BugReportStatus;
  onChange: (status: BugReportStatus) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <select
      id={id}
      className={cn(
        "h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium shadow-sm sm:text-sm",
        className
      )}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as BugReportStatus)}
      aria-label="Cập nhật trạng thái bug"
    >
      {BUG_STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {formatBugStatus(status)}
        </option>
      ))}
    </select>
  );
}

export const bugPage = {
  page: "w-full min-w-0 space-y-6 pb-28 md:pb-10",
} as const;
