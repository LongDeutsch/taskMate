import type { ReactNode } from "react";
import type { TaskPriority, TaskStatus } from "@/shared/types";
import { cn } from "@/shared/lib/utils";
import { StickyNote } from "lucide-react";
import { StatusBadge, PriorityBadge } from "./task-detail-ui";

export const at = {
  page: "w-full min-w-0 space-y-6 pb-28 md:space-y-8 md:pb-10",
  pageTitle: "text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-[28px] lg:font-semibold",
  pageSubtitle: "text-sm text-gray-500 [overflow-wrap:anywhere]",
  surface:
    "min-w-0 rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
  toolbar: "flex min-w-0 flex-col gap-3 p-4 sm:p-5",
  select:
    "h-11 min-w-0 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 md:h-9 md:min-w-[130px] md:w-auto",
  search:
    "h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 md:h-9",
  label: "text-sm font-medium text-gray-700",
  sectionTitle: "text-xs font-semibold uppercase tracking-wide text-gray-500",
  primaryBtn:
    "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60",
  taskCard:
    "group min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
  taskCardActive: "ring-2 ring-blue-500/30 border-blue-200",
  taskCardNote: "border-amber-200/80 bg-amber-50/30",
  iconBtn:
    "size-8 text-gray-500 hover:bg-gray-100 hover:text-gray-900",
  iconBtnDanger: "size-8 text-gray-500 hover:bg-red-50 hover:text-red-600",
  iconBtnPrimary: "size-8 text-gray-500 hover:bg-blue-50 hover:text-blue-600",
  feedbackScroll:
    "max-h-[180px] min-h-[100px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50",
} as const;

export function TaskStatusLabel({ status }: { status: TaskStatus }) {
  return <StatusBadge status={status} />;
}

export function TaskPriorityLabel({ priority }: { priority: TaskPriority }) {
  return <PriorityBadge priority={priority} />;
}

export function SelfNoteBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
      <StickyNote className="size-3" />
      Note cá nhân
    </span>
  );
}

export function ProjectTag({ name }: { name: string }) {
  return (
    <span className="inline-flex max-w-[200px] truncate rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      {name}
    </span>
  );
}

export function AssigneeTag({ name }: { name: string }) {
  return (
    <span className="inline-flex max-w-[160px] truncate rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
      {name}
    </span>
  );
}

export function DeadlineTag({ deadline }: { deadline: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
      {deadline}
    </span>
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
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
        className
      )}
    >
      {children}
    </button>
  );
}
