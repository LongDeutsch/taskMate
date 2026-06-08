// File: src/app/components/app-sidebar.tsx
import { FolderKanban } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

export function AppSidebar() {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#E5E7EB] px-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
          <FolderKanban className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-gray-900">TaskMate</div>
          <div className="text-xs text-gray-500">Workspace</div>
        </div>
      </div>
      <SidebarNav className="min-h-0 flex-1" />
    </div>
  );
}
