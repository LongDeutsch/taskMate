// File: src/app/components/app-header.tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { FolderKanban, LogOut, Menu, UserCircle } from "lucide-react";
import { formatRoleLabel, getRoleLabel } from "@/shared/types";
import { UserAvatar } from "@/shared/components/user-avatar";
import { useAvatarCacheBust } from "@/shared/hooks/use-avatar-cache-bust";

type AppHeaderProps = {
  onOpenMenu?: () => void;
};

export function AppHeader({ onOpenMenu }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const avatarTs = useAvatarCacheBust();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const roleLabel = user ? formatRoleLabel(getRoleLabel(user)) : "";
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#E5E7EB] bg-white px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 md:hidden"
          aria-label="Mở menu"
          onClick={onOpenMenu}
        >
          <Menu className="size-5" />
        </Button>
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
            <FolderKanban className="size-4" />
          </div>
          <span className="truncate text-sm font-semibold text-gray-900">TaskMate</span>
        </div>
        <div className="hidden min-w-0 items-center gap-2 text-sm text-gray-600 md:flex">
          <span className="inline-flex max-w-[min(100%,420px)] items-center gap-2 rounded-full border border-[#E5E7EB] bg-gray-50 px-3 py-1.5">
            {user?.avatar ? (
              <UserAvatar
                avatar={user.avatar}
                cacheBust={avatarTs}
                className="size-6 shrink-0 ring-1 ring-[#E5E7EB]"
              />
            ) : (
              <UserCircle className="size-5 shrink-0 text-gray-500" />
            )}
            <span className="truncate font-medium text-gray-900">{user?.fullName ?? "—"}</span>
            {roleLabel ? (
              <span className="hidden shrink-0 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-semibold text-[#2563EB] ring-1 ring-[#BFDBFE] lg:inline">
                {roleLabel}
              </span>
            ) : null}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationBell />
        <Button
          variant="ghost"
          size="icon"
          className="size-11 text-gray-600 hover:text-gray-900"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <LogOut className="size-4" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  );
}
