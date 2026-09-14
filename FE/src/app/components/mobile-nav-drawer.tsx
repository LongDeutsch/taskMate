import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { cn } from "@/shared/lib/utils";
import { SidebarNav } from "./sidebar-nav";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        aria-label="Đóng menu"
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute left-0 top-0 flex h-full w-[min(100vw-3rem,280px)] flex-col bg-card text-card-foreground shadow-2xl transition-colors dark:border-r dark:border-slate-800 dark:bg-slate-900",
          "animate-in slide-in-from-left duration-200"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200/60 dark:bg-blue-950/60 dark:text-blue-400 dark:ring-blue-800">
              <FolderKanban className="size-5" />
            </div>
            <span className="text-sm font-semibold text-foreground">TaskMate</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button type="button" variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground" onClick={onClose}>
              <X className="size-5" />
            </Button>
          </div>
        </div>
        <SidebarNav onNavigate={onClose} className="min-h-0 flex-1" />
      </aside>
    </div>,
    document.body
  );
}
