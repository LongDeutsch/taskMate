import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Shared Projects admin page tokens (aligned with tasks admin UI). */
export const pj = {
  page: "w-full min-w-0 space-y-6 pb-28 md:pb-10",
  pageTitle: "text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-[28px] lg:font-semibold",
  pageSubtitle: "text-sm text-gray-500 [overflow-wrap:anywhere]",
  surface:
    "min-w-0 rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
  toolbar: "p-4 sm:p-5",
  search:
    "h-11 w-full min-w-0 rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 md:h-9",
  primaryBtn:
    "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60",
  projectCard:
    "min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
  projectCardActive: "ring-2 ring-blue-500/25 border-blue-200",
  iconBtn:
    "size-9 text-gray-500 hover:bg-gray-100 hover:text-gray-900",
  iconBtnPrimary: "size-9 text-gray-500 hover:bg-blue-50 hover:text-blue-600",
  iconBtnDanger:
    "size-9 text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:text-red-600",
} as const;

export function MembersLink({ projectId }: { projectId: string }) {
  return (
    <Link
      to={`/admin/projects/${projectId}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-gray-50 px-3 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:border-blue-200 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
    >
      <Users className="size-3.5 shrink-0" />
      Members
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
        "mt-1 text-sm leading-relaxed text-gray-500",
        text ? "line-clamp-2" : "italic text-gray-400",
        className
      )}
    >
      {text || "Chưa có mô tả."}
    </p>
  );
}
