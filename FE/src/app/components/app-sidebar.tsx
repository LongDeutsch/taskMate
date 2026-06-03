// File: src/app/components/app-sidebar.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarOff,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Trash2,
  UserCircle,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getRoleLabel } from "@/shared/types";
import { apiBaseUrl } from "@/shared/api";

const baseNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "My Tasks", icon: ListTodo, hideForHr: true },
  { to: "/time-off", label: "Xin off", icon: CalendarOff },
  { to: "/profile", label: "Profile", icon: UserCircle },
  { to: "/automation", label: "Automation", icon: Zap },
];

const adminItems = [
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/tasks", label: "Tasks (CRUD)", icon: ClipboardList },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/trash", label: "Thùng rác", icon: Trash2 },
];

export function AppSidebar() {
  const { isAdmin, user } = useAuth();
  const roleLabel = user ? getRoleLabel(user) : "STAFF";
  const [avatarTs, setAvatarTs] = useState(() =>
    typeof localStorage !== "undefined"
      ? localStorage.getItem("taskmate_avatar_ts") ?? "0"
      : "0"
  );
  useEffect(() => {
    const handler = () => setAvatarTs(localStorage.getItem("taskmate_avatar_ts") ?? "0");
    window.addEventListener("taskmate-auth-update", handler);
    return () => window.removeEventListener("taskmate-auth-update", handler);
  }, []);

  const navItems = useMemo(
    () => baseNavItems.filter((item) => !(item.hideForHr && roleLabel === "HR")),
    [roleLabel]
  );
  const avatarUrl = useMemo(() => {
    const raw = user?.avatar;
    if (!raw) return null;
    const base = raw.startsWith("http") ? raw : `${apiBaseUrl}${raw}`;
    return `${base}${base.includes("?") ? "&" : "?"}v=${avatarTs}`;
  }, [user?.avatar, avatarTs]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-200",
      isActive
        ? "bg-[#EFF6FF] font-semibold text-[#2563EB] before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-[#2563EB]"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    );

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[#E5E7EB] bg-white">
      <div className="flex h-14 items-center gap-3 border-b border-[#E5E7EB] px-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
          <FolderKanban className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-gray-900">TaskMate</div>
          <div className="text-xs text-gray-500">Workspace</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass}>
            <Icon className="size-5 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <div className="px-3 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Admin
              </p>
            </div>
            <div className="mt-2 space-y-1">
              {adminItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkClass}>
                  <Icon className="size-5 shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-[#E5E7EB] p-3">
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-white ring-1 ring-[#E5E7EB]">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <UserCircle className="size-5 text-gray-500" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-gray-900">
              {user?.fullName ?? "—"}
            </div>
            <div className="truncate text-xs text-gray-500">{roleLabel}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
