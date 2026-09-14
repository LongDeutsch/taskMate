import { NavLink } from "react-router-dom";
import { UserCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getRoleLabel } from "@/shared/types";
import { UserAvatar } from "@/shared/components/user-avatar";
import { useAvatarCacheBust } from "@/shared/hooks/use-avatar-cache-bust";
import { TodayBirthdaySection } from "@/features/dashboard/components/today-birthday-section";
import { adminNavItems, getBaseNavItems } from "../config/nav-items";

export function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-200",
    isActive
      ? "bg-blue-50 font-semibold text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-blue-600 dark:before:bg-blue-500"
      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
  );
}

type SidebarNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export function SidebarNav({ onNavigate, className }: SidebarNavProps) {
  const { isAdmin, user } = useAuth();
  const avatarTs = useAvatarCacheBust();
  const roleLabel = user ? getRoleLabel(user) : "STAFF";
  const navItems = getBaseNavItems(roleLabel);

  return (
    <nav className={cn("flex flex-1 flex-col", className)}>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navLinkClass} onClick={onNavigate}>
            <Icon className="size-5 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <div className="px-3 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Admin
              </p>
            </div>
            <div className="mt-2 space-y-1">
              {adminNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={navLinkClass} onClick={onNavigate}>
                  <Icon className="size-5 shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 px-3 pb-2">
        <TodayBirthdaySection currentUserId={user?.id} variant="sidebar" />
      </div>

      <div className="shrink-0 border-t border-border p-3 dark:border-slate-800">
        <div className="flex min-h-11 items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 dark:bg-slate-800/50">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-border dark:ring-slate-700">
            {user?.avatar ? (
              <UserAvatar avatar={user.avatar} cacheBust={avatarTs} className="size-8" />
            ) : (
              <UserCircle className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {user?.fullName ?? "—"}
            </div>
            <div className="truncate text-xs text-muted-foreground">{roleLabel}</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
