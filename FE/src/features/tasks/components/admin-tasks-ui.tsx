import type { ReactNode } from "react";
import type { TaskPriority, TaskStatus } from "@/shared/types";
import { cn } from "@/shared/lib/utils";
import { StickyNote } from "lucide-react";
import { StatusBadge, PriorityBadge } from "./task-detail-ui";

export const at = {
  page: "w-full min-w-0 space-y-6 pb-28 md:space-y-8 md:pb-10",
  pageTitle: "text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-[28px] lg:font-semibold",
  pageSubtitle: "text-sm text-muted-foreground [overflow-wrap:anywhere]",
  surface:
    "min-w-0 rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-slate-800",
  toolbar: "flex min-w-0 flex-col gap-3 p-4 sm:p-5",
  select:
    "h-11 min-w-0 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 md:h-9 md:min-w-[130px] md:w-auto dark:border-slate-800",
  search:
    "h-11 w-full min-w-0 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 md:h-9 dark:border-slate-800",
  label: "text-sm font-medium text-foreground",
  sectionTitle: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  primaryBtn:
    "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60",
  taskCard:
    "group min-w-0 rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:border-slate-800",
  taskCardActive: "ring-2 ring-blue-500/30 border-blue-200 dark:border-blue-800",
  taskCardNote: "border-amber-200/80 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20",
  iconBtn:
    "size-8 text-muted-foreground hover:bg-muted hover:text-foreground",
  iconBtnDanger: "size-8 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600",
  iconBtnPrimary: "size-8 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600",
  feedbackScroll:
    "max-h-[180px] min-h-[100px] overflow-y-auto rounded-lg border border-border bg-muted/30 dark:border-slate-800",
} as const;

export function TaskStatusLabel({ status }: { status: TaskStatus }) {
  return <StatusBadge status={status} />;
}

export function TaskPriorityLabel({ priority }: { priority: TaskPriority }) {
  return <PriorityBadge priority={priority} />;
}

export function SelfNoteBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
      <StickyNote className="size-3" />
      Note cá nhân
    </span>
  );
}

export function ProjectTag({ name }: { name: string }) {
  return (
    <span className="inline-flex max-w-[200px] truncate rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {name}
    </span>
  );
}

export function AssigneeTag({ name }: { name: string }) {
  return (
    <span className="inline-flex max-w-[160px] truncate rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {name}
    </span>
  );
}

export function DeadlineTag({ deadline }: { deadline: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {deadline}
    </span>
  );
}

/** Khung chờ dạng skeleton cho danh sách task (dùng khi lần đầu tải dữ liệu). */
export function TaskListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className={at.taskCard}>
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="flex flex-wrap gap-2">
              <div className="h-5 w-16 rounded-md bg-muted" />
              <div className="h-5 w-20 rounded-md bg-muted" />
              <div className="h-5 w-24 rounded-md bg-muted" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
        active
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          : "border-border bg-card text-muted-foreground hover:bg-muted dark:border-slate-800",
        className
      )}
    >
      {children}
    </button>
  );
}
