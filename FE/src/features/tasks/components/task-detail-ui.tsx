import type { ReactNode } from "react";
import type { TaskPriority, TaskStatus } from "@/shared/types";
import { cn } from "@/shared/lib/utils";

/** Shared Task Detail page styling tokens */
export const td = {
  page: "mx-auto max-w-6xl space-y-6 pb-24",
  twoCol:
    "grid grid-cols-1 gap-6 min-w-0 lg:grid-cols-[minmax(0,13fr)_minmax(280px,7fr)] lg:items-start",
  stack: "space-y-6",
  surfaceCard: "gap-0 rounded-2xl border border-gray-200 bg-white py-0 shadow-sm",
  cardHeader: "flex flex-row items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6",
  cardBody: "space-y-5 px-5 py-5 sm:px-6",
  detailLabel: "text-sm font-semibold text-blue-700",
  muted: "text-sm text-[#6B7280]",
  empty: "text-sm italic text-[#6B7280]",
  sectionTitle: "text-xs font-semibold uppercase tracking-wide text-[#6B7280]",
  feedbackCard:
    "flex max-h-[min(640px,70vh)] flex-col gap-0 overflow-hidden rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] py-0 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
  feedbackHeader:
    "sticky top-0 z-10 flex shrink-0 flex-row items-center justify-between gap-3 border-b border-[#DDD6FE] bg-[#F5F3FF] px-5 py-4",
  feedbackScrollBody:
    "max-h-[min(480px,60vh)] overflow-y-auto px-5 py-4 text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap break-words",
  userCard: "gap-0 rounded-2xl border border-emerald-200 bg-emerald-50/40 py-0 shadow-sm",
  input:
    "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60",
  select:
    "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60",
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
  Todo: "border-gray-200 bg-gray-50 text-gray-700",
  InProgress: "border-blue-200 bg-blue-50 text-blue-700",
  Done: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const priorityStyles: Record<TaskPriority, string> = {
  Low: "border-gray-200 bg-gray-50 text-gray-600",
  Medium: "border-amber-200 bg-amber-50 text-amber-800",
  High: "border-red-200 bg-red-50 text-red-700",
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

export function StatusBadge({ status }: { status: TaskStatus }) {
  const label = status === "InProgress" ? "In Progress" : status;
  return <MetaBadge className={statusStyles[status]}>{label}</MetaBadge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <MetaBadge className={priorityStyles[priority]}>{priority}</MetaBadge>;
}

export function DeadlineBadge({ deadline }: { deadline: string }) {
  return (
    <MetaBadge className="border-gray-200 bg-white text-[#6B7280]">
      Hạn: {deadline}
    </MetaBadge>
  );
}
