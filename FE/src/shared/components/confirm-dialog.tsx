import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title = "Xác nhận",
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  loading = false,
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-150"
      aria-hidden={false}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        aria-label="Đóng"
        disabled={loading}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.22)] animate-in zoom-in-95 duration-150"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="mt-3 text-sm leading-relaxed text-slate-600">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onCancel}
            className="min-w-[84px] border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={
              variant === "danger"
                ? "min-w-[84px] bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40 shadow-sm"
                : "min-w-[84px] bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500/40 shadow-sm"
            }
          >
            {loading ? "Đang xử lý..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
