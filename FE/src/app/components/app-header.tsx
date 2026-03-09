// File: src/app/components/app-header.tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { LogOut } from "lucide-react";

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="text-sm text-muted-foreground">
        Logged in as <span className="font-medium text-foreground">{user?.fullName}</span>
        {" · "}
        <span className="capitalize">{user?.role.toLowerCase()}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="size-4" />
        Logout
      </Button>
    </header>
  );
}
