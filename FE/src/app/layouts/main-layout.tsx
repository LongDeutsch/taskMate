// File: src/app/layouts/main-layout.tsx
import { Outlet } from "react-router-dom";
import { AppSidebar } from "../components/app-sidebar";
import { AppHeader } from "../components/app-header";
import { AiChatWidget } from "@/features/ai/components/ai-chat-widget";

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
        <AiChatWidget />
      </div>
    </div>
  );
}
