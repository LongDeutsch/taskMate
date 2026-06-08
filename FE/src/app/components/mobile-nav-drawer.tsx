import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        className="absolute inset-0 bg-black/40 transition-opacity duration-200"
        aria-label="Đóng menu"
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute left-0 top-0 flex h-full w-[min(100vw-3rem,280px)] flex-col bg-white shadow-xl",
          "animate-in slide-in-from-left duration-200"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
              <FolderKanban className="size-5" />
            </div>
            <span className="text-sm font-semibold text-gray-900">TaskMate</span>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-11" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
        <SidebarNav onNavigate={onClose} className="min-h-0 flex-1" />
      </aside>
    </div>,
    document.body
  );
}
