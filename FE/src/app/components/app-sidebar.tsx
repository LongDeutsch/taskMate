// File: src/app/components/app-sidebar.tsx
import { FolderKanban } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

export function AppSidebar() {
  return (
    <div className="flex h-full w-full flex-col bg-card text-card-foreground transition-colors dark:bg-slate-900">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 dark:border-slate-800">
        <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200/60 dark:bg-blue-950/60 dark:text-blue-400 dark:ring-blue-800">
          <FolderKanban className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-foreground">TaskMate</div>
          <div className="text-xs text-muted-foreground">Workspace</div>
        </div>
      </div>
      <SidebarNav className="min-h-0 flex-1" />
    </div>
  );
}
