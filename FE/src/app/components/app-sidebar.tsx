// File: src/app/components/app-sidebar.tsx
import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  Users,
  Zap,
  ClipboardList,
  FolderKanban,
  UserCircle,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { apiBaseUrl } from "@/shared/api";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "My Tasks", icon: ListTodo },
  { to: "/profile", label: "Profile", icon: UserCircle },
  { to: "/automation", label: "Automation", icon: Zap },
];

const adminItems = [
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/tasks", label: "Tasks (CRUD)", icon: ClipboardList },
  { to: "/admin/users", label: "Users", icon: Users },
];

export function AppSidebar() {
  const { isAdmin, user } = useAuth();
  const [avatarTs, setAvatarTs] = useState(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem("taskmate_avatar_ts") ?? "0" : "0"
  );
  useEffect(() => {
    const handler = () =>
      setAvatarTs(localStorage.getItem("taskmate_avatar_ts") ?? "0");
    window.addEventListener("taskmate-auth-update", handler);
    return () => window.removeEventListener("taskmate-auth-update", handler);
  }, []);
  const baseAvatarUrl = user?.avatar
    ? user.avatar.startsWith("http")
      ? user.avatar
      : `${apiBaseUrl}${user.avatar}`
    : null;
  const avatarUrl = baseAvatarUrl ? `${baseAvatarUrl}${baseAvatarUrl.includes("?") ? "&" : "?"}v=${avatarTs}` : null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );

  return (
    <aside className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-8 rounded-full object-cover border border-sidebar-border"
          />
        ) : (
          <div className="size-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <UserCircle className="size-5 text-muted-foreground" />
          </div>
        )}
        <span className="font-semibold text-sidebar-foreground">TaskMate</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass}>
            <Icon className="size-4 shrink-0" />
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-sidebar-border pt-2">
              <p className="px-3 text-xs font-medium text-muted-foreground">Admin</p>
            </div>
            {adminItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="size-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
