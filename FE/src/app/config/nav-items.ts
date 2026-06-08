import type { LucideIcon } from "lucide-react";
import {
  Bug,
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

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  hideForHr?: boolean;
};

export const hrNavPaths = ["/users", "/time-off", "/profile"] as const;

export const baseNavItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bug-reports", label: "Báo bug", icon: Bug },
  { to: "/tasks", label: "My Tasks", icon: ListTodo, hideForHr: true },
  { to: "/users", label: "Users", icon: Users },
  { to: "/time-off", label: "Xin off", icon: CalendarOff },
  { to: "/profile", label: "Profile", icon: UserCircle },
  { to: "/automation", label: "Automation", icon: Zap },
];

export function getBaseNavItems(roleLabel: string) {
  if (roleLabel === "HR") {
    return baseNavItems.filter((item) =>
      (hrNavPaths as readonly string[]).includes(item.to)
    );
  }
  return baseNavItems.filter((item) => !(item.hideForHr && roleLabel === "HR"));
}

export const adminNavItems: NavItem[] = [
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/tasks", label: "Tasks (CRUD)", icon: ClipboardList },
  { to: "/admin/users", label: "Quản lý Users", icon: Users },
  { to: "/admin/trash", label: "Thùng rác", icon: Trash2 },
];
