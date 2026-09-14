import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Shared Projects admin page tokens (aligned with tasks admin UI). */
export const pj = {
  page: "w-full min-w-0 space-y-6 pb-28 md:pb-10",
  pageTitle: "text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-[28px] lg:font-semibold",
  pageSubtitle: "text-sm text-muted-foreground [overflow-wrap:anywhere]",
  surface:
    "min-w-0 rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-slate-800",
  toolbar: "p-4 sm:p-5",
  search:
    "h-11 w-full min-w-0 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 md:h-9 dark:border-slate-800",
  primaryBtn:
    "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60",
  projectCard:
    "min-w-0 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:border-slate-800",
  projectCardActive: "ring-2 ring-blue-500/25 border-blue-200 dark:border-blue-800",
  iconBtn:
    "size-9 text-muted-foreground hover:bg-muted hover:text-foreground",
  iconBtnPrimary: "size-9 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600",
  iconBtnDanger:
    "size-9 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 focus-visible:text-rose-600",
} as const;

export function MembersLink({ projectId }: { projectId: string }) {
  return (
    <Link
      to={`/admin/projects/${projectId}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-600 dark:border-slate-800"
    >
      <Users className="size-3.5 shrink-0" />
      Thành viên
    </Link>
  );
}

export function ProjectDescription({
  description,
  className,
}: {
  description: string;
  className?: string;
}) {
  const text = description?.trim();
  return (
    <p
      className={cn(
        "mt-1 text-sm leading-relaxed text-muted-foreground",
        text ? "line-clamp-2" : "italic text-muted-foreground/70",
        className
      )}
    >
      {text || "Chưa có mô tả."}
    </p>
  );
}
