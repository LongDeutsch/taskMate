import { NavLink } from "react-router-dom";
import { CalendarOff, LayoutDashboard, ListTodo, UserCircle, Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getRoleLabel } from "@/shared/types";

export function MobileBottomNav() {
  const { isAdmin, user } = useAuth();
  const roleLabel = user ? getRoleLabel(user) : "STAFF";

  const tasksTo = isAdmin ? "/admin/tasks" : "/tasks";
  const tasksLabel = isAdmin ? "Tasks" : "My Tasks";
  const items =
    roleLabel === "HR"
      ? [
          { to: "/time-off", label: "Xin off", icon: CalendarOff },
          { to: "/users", label: "Users", icon: Users },
          { to: "/profile", label: "Profile", icon: UserCircle },
        ]
      : [
          { to: "/dashboard", label: "Home", icon: LayoutDashboard },
          { to: tasksTo, label: tasksLabel, icon: ListTodo },
          { to: "/profile", label: "Profile", icon: UserCircle },
        ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E7EB] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Điều hướng chính"
    >
      <ul className="flex items-stretch justify-around">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-medium transition-colors",
                  isActive ? "text-[#2563EB]" : "text-gray-500"
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
