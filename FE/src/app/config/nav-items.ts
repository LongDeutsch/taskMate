import type { LucideIcon } from "lucide-react";
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

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  hideForHr?: boolean;
};

export const baseNavItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "My Tasks", icon: ListTodo, hideForHr: true },
  { to: "/time-off", label: "Xin off", icon: CalendarOff },
  { to: "/profile", label: "Profile", icon: UserCircle },
  { to: "/automation", label: "Automation", icon: Zap },
];

export const adminNavItems: NavItem[] = [
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/tasks", label: "Tasks (CRUD)", icon: ClipboardList },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/trash", label: "Thùng rác", icon: Trash2 },
];
