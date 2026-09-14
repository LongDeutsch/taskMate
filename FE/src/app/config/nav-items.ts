import type { LucideIcon } from "lucide-react";
import { getRoleLabel, type RoleLabel, type User } from "@/shared/types";
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

export const hrNavPaths = ["/time-off", "/users", "/profile"] as const;

/** Trang mặc định sau đăng nhập / truy cập `/`. */
export function getHomePathForRole(roleLabel: RoleLabel | string): string {
  if (roleLabel === "HR") return "/time-off";
  return "/dashboard";
}

export function getHomePathForUser(user: Pick<User, "role" | "roleLabel"> | null): string {
  if (!user) return "/login";
  return getHomePathForRole(getRoleLabel(user));
}

export const baseNavItems: NavItem[] = [
  { to: "/dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { to: "/bug-reports", label: "Báo lỗi", icon: Bug },
  { to: "/tasks", label: "Công việc của tôi", icon: ListTodo, hideForHr: true },
  { to: "/users", label: "Thành viên", icon: Users },
  { to: "/time-off", label: "Nghỉ phép", icon: CalendarOff },
  { to: "/profile", label: "Hồ sơ cá nhân", icon: UserCircle },
  { to: "/automation", label: "Tự động hóa", icon: Zap },
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
  { to: "/admin/projects", label: "Quản lý dự án", icon: FolderKanban },
  { to: "/admin/tasks", label: "Quản lý công việc", icon: ClipboardList },
  { to: "/admin/users", label: "Quản lý người dùng", icon: Users },
  { to: "/admin/trash", label: "Thùng rác", icon: Trash2 },
];
