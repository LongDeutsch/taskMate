import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

type FilterSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  onApply?: () => void;
  onReset?: () => void;
  activeCount?: number;
};

export function FilterSheetTrigger({
  onClick,
  activeCount = 0,
  className,
}: {
  onClick: () => void;
  activeCount?: number;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("h-11 w-full gap-2 border-gray-200 md:hidden", className)}
      onClick={onClick}
    >
      <SlidersHorizontal className="size-4" />
      Bộ lọc
      {activeCount > 0 && (
        <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
          {activeCount}
        </span>
      )}
    </Button>
  );
}

export function FilterSheet({
  open,
  onClose,
  title = "Bộ lọc",
  children,
  onApply,
  onReset,
}: FilterSheetProps) {
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
    <div className="fixed inset-0 z-[65] md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 flex max-h-[min(90vh,640px)] flex-col rounded-t-2xl bg-white shadow-xl",
          "animate-in slide-in-from-bottom duration-200"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <Button type="button" variant="ghost" size="icon" className="size-11" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 [&_select]:h-11 [&_select]:w-full [&_input]:min-h-11">
          {children}
        </div>
        <div className="flex shrink-0 gap-2 border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {onReset && (
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={onReset}>
              Đặt lại
            </Button>
          )}
          <Button
            type="button"
            className="h-11 flex-1 bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              onApply?.();
              onClose();
            }}
          >
            Áp dụng
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Desktop toolbar: ẩn trên mobile khi dùng FilterSheet */
export function DesktopFilterRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hidden flex-wrap items-center gap-2 md:flex",
        className
      )}
    >
      {children}
    </div>
  );
}
