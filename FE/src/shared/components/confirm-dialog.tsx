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
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title = "Xác nhận",
  message,
  confirmLabel = "Có",
  cancelLabel = "Không",
  loading = false,
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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      aria-hidden={false}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px]"
        aria-label="Đóng"
        disabled={loading}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.28)]"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="mt-3 text-base leading-relaxed text-slate-700">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onCancel}
            className="min-w-[88px] border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="min-w-[88px] bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40"
          >
            {loading ? "Đang xử lý..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
