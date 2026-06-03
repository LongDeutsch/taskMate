import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

let overlayCount = 0;

function setOverlayOpen(open: boolean) {
  overlayCount = open ? overlayCount + 1 : Math.max(0, overlayCount - 1);
  if (overlayCount > 0) {
    document.documentElement.dataset.taskmateOverlay = "open";
    document.body.style.overflow = "hidden";
  } else {
    delete document.documentElement.dataset.taskmateOverlay;
    document.body.style.overflow = "";
  }
}

type TaskDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind max-width class, e.g. max-w-[840px] */
  panelClassName?: string;
};

/** Right-side drawer for wide forms (admin edit, feedback edit). */
export function TaskDetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  panelClassName = "max-w-[840px]",
}: TaskDetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    setOverlayOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      setOverlayOpen(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      data-taskmate-overlay
      className="fixed inset-0 z-50 flex items-end justify-end md:items-stretch"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex w-full flex-col bg-white shadow-xl",
          "max-h-[min(92vh,100dvh)] rounded-t-2xl md:h-full md:max-h-none md:rounded-none",
          panelClassName
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-drawer-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 sm:px-6">
          <div className="min-w-0 pr-2">
            <h2
              id="task-detail-drawer-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-[#6B7280]"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

type TaskDetailModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Centered modal for reading long feedback. */
export function TaskDetailModal({
  open,
  onClose,
  title,
  children,
  footer,
}: TaskDetailModalProps) {
  useEffect(() => {
    if (!open) return;
    setOverlayOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      setOverlayOpen(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      data-taskmate-overlay
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-3xl flex-col rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:max-h-[min(85vh,720px)] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#5B21B6]">{title}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-gray-200 px-5 py-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
