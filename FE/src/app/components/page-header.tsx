import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Desktop: actions bên phải. Mobile: ẩn nếu dùng fab / overflow. */
  actions?: ReactNode;
  /** Mobile-only row (FAB area, overflow menu). */
  mobileActions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  actions,
  mobileActions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-[28px] lg:font-semibold">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 [overflow-wrap:anywhere]">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="hidden flex-wrap items-center gap-2 md:flex md:justify-end">
            {actions}
          </div>
        )}
      </div>
      {mobileActions && <div className="flex flex-wrap items-center gap-2 md:hidden">{mobileActions}</div>}
    </header>
  );
}
