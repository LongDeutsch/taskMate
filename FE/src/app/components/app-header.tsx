// File: src/app/components/app-header.tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { ThemeToggle } from "@/shared/components/theme-toggle";
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
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/90 backdrop-blur-sm px-3 md:px-4 text-card-foreground transition-colors">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 md:hidden text-foreground"
          aria-label="Mở menu"
          onClick={onOpenMenu}
        >
          <Menu className="size-5" />
        </Button>
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <FolderKanban className="size-4" />
          </div>
          <span className="truncate text-sm font-semibold text-foreground">TaskMate</span>
        </div>
        <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground md:flex">
          <span className="inline-flex max-w-[min(100%,420px)] items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
            {user?.avatar ? (
              <UserAvatar
                avatar={user.avatar}
                cacheBust={avatarTs}
                className="size-6 shrink-0 ring-1 ring-border"
              />
            ) : (
              <UserCircle className="size-5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate font-medium text-foreground">{user?.fullName ?? "—"}</span>
            {roleLabel ? (
              <span className="hidden shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800 lg:inline">
                {roleLabel}
              </span>
            ) : null}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <NotificationBell />
        <Button
          variant="ghost"
          size="icon"
          className="size-9 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
          aria-label="Đăng xuất"
          title="Đăng xuất"
        >
          <LogOut className="size-4" />
          <span className="sr-only">Đăng xuất</span>
        </Button>
      </div>
    </header>
  );
}
