// File: src/shared/lib/toast.ts

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

function add(type: ToastType, title: string, description?: string, duration = 3500) {
  const id = Math.random().toString(36).substring(2, 9);
  const item: ToastItem = { id, type, title, description, duration };
  // Limit to at most 4 toasts at once to prevent screen flooding
  toasts = [...toasts.slice(-3), item];
  notify();

  if (duration > 0) {
    setTimeout(() => {
      dismiss(id);
    }, duration);
  }

  return id;
}

export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    add("success", title, description, duration),
  error: (title: string, description?: string, duration?: number) =>
    add("error", title, description, duration ?? 4500),
  info: (title: string, description?: string, duration?: number) =>
    add("info", title, description, duration),
  warning: (title: string, description?: string, duration?: number) =>
    add("warning", title, description, duration),
  dismiss,
};

export function subscribeToasts(listener: ToastListener) {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}
