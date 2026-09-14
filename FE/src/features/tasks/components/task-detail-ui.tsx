import type { ReactNode } from "react";
import type { TaskPriority, TaskStatus } from "@/shared/types";
import { cn } from "@/shared/lib/utils";

/** Shared Task Detail page styling tokens */
export const td = {
  page: "mx-auto max-w-6xl space-y-6 pb-24",
  twoCol:
    "grid grid-cols-1 gap-6 min-w-0 lg:grid-cols-[minmax(0,13fr)_minmax(280px,7fr)] lg:items-start",
  stack: "space-y-6",
  surfaceCard: "gap-0 rounded-2xl border border-border bg-card py-0 shadow-sm dark:border-slate-800",
  cardHeader: "flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6",
  cardBody: "space-y-5 px-5 py-5 sm:px-6",
  detailLabel: "text-sm font-semibold text-blue-600 dark:text-blue-400",
  muted: "text-sm text-muted-foreground",
  empty: "text-sm italic text-muted-foreground",
  sectionTitle: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  feedbackCard:
    "flex max-h-[min(640px,70vh)] flex-col gap-0 overflow-hidden rounded-2xl border border-purple-200 bg-purple-50/50 dark:border-purple-900/40 dark:bg-purple-950/20 py-0 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
  feedbackHeader:
    "sticky top-0 z-10 flex shrink-0 flex-row items-center justify-between gap-3 border-b border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 px-5 py-4",
  feedbackScrollBody:
    "max-h-[min(480px,60vh)] overflow-y-auto px-5 py-4 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words",
  userCard: "gap-0 rounded-2xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 py-0 shadow-sm",
  input:
    "h-10 w-full rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 dark:border-slate-800",
  select:
    "h-10 w-full rounded-lg border border-border bg-card text-foreground px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 dark:border-slate-800",
  primaryBtn:
    "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60",
} as const;

export function DetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className={td.detailLabel}>{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function EmptyValue({ children }: { children: ReactNode }) {
  return <p className={td.empty}>{children}</p>;
}

const statusStyles: Record<TaskStatus, string> = {
  Todo: "border-border bg-muted text-muted-foreground",
  InProgress: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300",
  Done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300",
};

const priorityStyles: Record<TaskPriority, string> = {
  Low: "border-border bg-muted text-muted-foreground",
  Medium: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300",
  High: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300",
};

function MetaBadge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

const statusLabelMap: Record<TaskStatus, string> = {
  Todo: "Cần làm",
  InProgress: "Đang làm",
  Done: "Hoàn thành",
};

const priorityLabelMap: Record<TaskPriority, string> = {
  Low: "Thấp",
  Medium: "Trung bình",
  High: "Cao",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <MetaBadge className={statusStyles[status]}>{statusLabelMap[status] ?? status}</MetaBadge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <MetaBadge className={priorityStyles[priority]}>{priorityLabelMap[priority] ?? priority}</MetaBadge>;
}

export function DeadlineBadge({ deadline }: { deadline: string }) {
  return (
    <MetaBadge className="border-border bg-card text-muted-foreground dark:border-slate-800">
      Hạn: {deadline}
    </MetaBadge>
  );
}
