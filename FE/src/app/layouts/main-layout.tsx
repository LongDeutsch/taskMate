// File: src/app/layouts/main-layout.tsx
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { wakeApi } from "@/shared/api";
import { AppSidebar } from "../components/app-sidebar";
import { AppHeader } from "../components/app-header";
import { MobileNavDrawer } from "../components/mobile-nav-drawer";
import { MobileBottomNav } from "../components/mobile-bottom-nav";
import { NewTaskLoginToast } from "@/features/notifications/components/new-task-login-toast";

export function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void wakeApi();
  }, []);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F9FAFB]">
      <aside className="hidden h-full w-[280px] shrink-0 border-r border-[#E5E7EB] md:flex">
        <AppSidebar />
      </aside>

      <MobileNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
        <MobileBottomNav />
        <NewTaskLoginToast />
      </div>
    </div>
  );
}
