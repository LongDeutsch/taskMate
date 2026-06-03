// File: src/app/components/app-header.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { LogOut, UserCircle } from "lucide-react";
import { formatRoleLabel, getRoleLabel } from "@/shared/types";
import { apiBaseUrl } from "@/shared/api";

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const roleLabel = user ? formatRoleLabel(getRoleLabel(user)) : "";
  const avatarUrl = useMemo(() => {
    const raw = user?.avatar;
    if (!raw) return null;
    const base = raw.startsWith("http") ? raw : `${apiBaseUrl}${raw}`;
    return `${base}${base.includes("?") ? "&" : "?"}v=${avatarTs}`;
  }, [user?.avatar, avatarTs]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-4">
      <div className="hidden items-center gap-2 text-sm text-gray-600 sm:flex">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-gray-50 px-3 py-1.5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-6 rounded-full object-cover ring-1 ring-[#E5E7EB]"
            />
          ) : (
            <UserCircle className="size-5 text-gray-500" />
          )}
          <span className="font-medium text-gray-900">{user?.fullName ?? "—"}</span>
          {roleLabel ? (
            <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-semibold text-[#2563EB] ring-1 ring-[#BFDBFE]">
              {roleLabel}
            </span>
          ) : null}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <NotificationBell />
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-900"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
