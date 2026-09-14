// File: src/components/ui/toaster.tsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { subscribeToasts, toast, type ToastItem, type ToastType } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";

function getToastIcon(type: ToastType) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />;
    case "error":
      return <AlertCircle className="size-5 shrink-0 text-rose-600" />;
    case "warning":
      return <AlertTriangle className="size-5 shrink-0 text-amber-600" />;
    case "info":
    default:
      return <Info className="size-5 shrink-0 text-blue-600" />;
  }
}

function getToastBorder(type: ToastType) {
  switch (type) {
    case "success":
      return "border-emerald-200/80 bg-card text-card-foreground dark:border-emerald-800/60 dark:bg-slate-900";
    case "error":
      return "border-rose-200/80 bg-card text-card-foreground dark:border-rose-800/60 dark:bg-slate-900";
    case "warning":
      return "border-amber-200/80 bg-card text-card-foreground dark:border-amber-800/60 dark:bg-slate-900";
    case "info":
    default:
      return "border-blue-200/80 bg-card text-card-foreground dark:border-blue-800/60 dark:bg-slate-900";
  }
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts(setItems);
  }, []);

  if (items.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      role="region"
      aria-label="Thông báo hệ thống"
      className="fixed top-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2.5 pointer-events-none px-4 sm:px-0"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all",
            "animate-in fade-in slide-in-from-top-2 duration-200",
            getToastBorder(item.type)
          )}
        >
          {getToastIcon(item.type)}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
            {item.description && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed break-words">
                {item.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(item.id)}
            aria-label="Đóng thông báo"
            className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
