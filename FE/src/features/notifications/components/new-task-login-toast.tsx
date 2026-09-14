import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X } from "lucide-react";
import type { AppNotification } from "@/shared/types";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useNotifications } from "../hooks/use-notifications";

const AUTO_DISMISS_MS = 8000;

/**
 * Hiển thị toast nổi khi user đăng nhập mà có thông báo chưa đọc, và cả khi
 * notification mới xuất hiện trong lúc user đang online.
 */
export function NewTaskLoginToast() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, unreadCount, isLoading } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [seen, setSeen] = useState<{ userId: string; unreadCount: number } | null>(null);

  useEffect(() => {
    if (!user || isLoading) return;

    const isNewUser = seen?.userId !== user.id;
    const previousUnread = isNewUser ? 0 : seen.unreadCount;
    const hasNewUnread = unreadCount > previousUnread;

    if (isNewUser || seen.unreadCount !== unreadCount) {
      setSeen({ userId: user.id, unreadCount });
    }
    if (!hasNewUnread) return;

    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
  }, [user, unreadCount, isLoading, seen]);

  // Tự ẩn nếu unreadCount đã về 0 (vd. user vừa mark all read ở chuông).
  useEffect(() => {
    if (visible && unreadCount === 0) setVisible(false);
  }, [visible, unreadCount]);

  if (!visible || !user || unreadCount === 0) return null;

  const preview = items.filter((n) => !n.read).slice(0, 3);
  const onlyOne = preview.length === 1 ? preview[0] : null;
  const hasNewAssignment = preview.some(
    (n) => n.type === "task_assigned" || n.type === "task_reassigned" || n.type === "task_collaborator"
  );
  const hasUserUpdate = preview.some((n) => n.type === "task_user_update");
  const hasDeadlineAlert = preview.some(
    (n) => n.type === "deadline_reminder" || n.type === "overdue_alert"
  );
  const hasTimeOff = preview.some(
    (n) => n.type === "time_off_submitted" || n.type === "time_off_status_updated"
  );
  const hasExternalJob = preview.some((n) => n.type === "external_job");
  const headlineSub = hasNewAssignment
    ? "Admin vừa giao việc cho bạn."
    : hasUserUpdate
      ? "Có thành viên vừa cập nhật task của họ."
      : hasDeadlineAlert
        ? "Có task sắp đến hạn hoặc đã quá hạn."
        : hasTimeOff
          ? "Có cập nhật về yêu cầu xin off."
          : hasExternalJob
            ? "Có thông báo từ job / crawl bên ngoài."
            : "Có task của bạn vừa được cập nhật.";

  function labelForType(type: AppNotification["type"]): string {
    switch (type) {
      case "task_assigned":
        return "giao task";
      case "task_reassigned":
        return "chuyển task sang bạn:";
      case "task_collaborator":
        return "thêm bạn vào task:";
      case "task_updated":
        return "cập nhật task:";
      case "task_user_update":
        return "đã cập nhật task được giao:";
      case "deadline_reminder":
        return "nhắc deadline task:";
      case "overdue_alert":
        return "cảnh báo task quá hạn:";
      case "time_off_submitted":
        return "đã gửi yêu cầu xin off";
      case "time_off_status_updated":
        return "đã cập nhật trạng thái xin off";
      case "external_job":
        return "job / crawl:";
      default:
        return "cập nhật:";
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[60] mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_16px_48px_rgba(15,23,42,0.14)] animate-in fade-in slide-in-from-bottom-4 duration-300 md:bottom-4 md:left-auto md:right-4 md:max-w-sm md:slide-in-from-right-4"
    >
      <div className="flex items-start gap-3 bg-slate-900 px-4 py-3 text-white">
        <span className="relative mt-0.5 inline-flex shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-40" />
          <Bell className="relative size-5 text-blue-400" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight text-white">
            Bạn có {unreadCount} thông báo mới
          </p>
          <p className="text-xs text-slate-300 mt-0.5">
            Chào {user.fullName} — {headlineSub}
          </p>
        </div>
        <button
          type="button"
          aria-label="Đóng"
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none"
          onClick={() => setVisible(false)}
        >
          <X className="size-4" />
        </button>
      </div>
      <ul className="divide-y divide-slate-100 bg-white">
        {preview.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => {
                setVisible(false);
                if (
                  n.type === "time_off_submitted" ||
                  n.type === "time_off_status_updated"
                ) {
                  navigate("/time-off");
                  return;
                }
                if (n.type === "external_job") {
                  navigate("/automation");
                  return;
                }
                if (n.taskId) navigate(`/tasks/${n.taskId}`);
              }}
              className="flex w-full flex-col items-start gap-0.5 border-l-2 border-l-blue-600 px-3.5 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors focus:outline-none"
            >
              <p className="line-clamp-2">
                <span className="font-semibold text-slate-900">{n.actorName || "Hệ thống"}</span>{" "}
                <span className="text-slate-500">{labelForType(n.type)}</span>{" "}
                {n.taskTitle && <span className="font-semibold text-slate-900">{n.taskTitle}</span>}
              </p>
              {n.changeSummary && (
                <p className="line-clamp-1 text-xs text-blue-700 font-medium">
                  {n.changeSummary}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
        <button
          type="button"
          className="text-xs font-medium text-slate-500 hover:text-slate-800 focus:outline-none rounded px-2.5 py-1.5 transition-colors"
          onClick={() => setVisible(false)}
        >
          Đóng
        </button>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none"
          onClick={() => {
            setVisible(false);
            if (onlyOne) {
              if (
                onlyOne.type === "time_off_submitted" ||
                onlyOne.type === "time_off_status_updated"
              ) {
                navigate("/time-off");
              } else if (onlyOne.type === "external_job") {
                navigate("/automation");
              } else if (onlyOne.taskId) {
                navigate(`/tasks/${onlyOne.taskId}`);
              } else {
                navigate("/tasks");
              }
            } else {
              navigate("/tasks");
            }
          }}
        >
          {onlyOne
            ? onlyOne.type === "time_off_submitted" ||
              onlyOne.type === "time_off_status_updated"
              ? "Mở Xin off"
              : onlyOne.type === "external_job"
                ? "Mở Automation"
                : "Xem task"
            : "Xem tất cả task"}
        </button>
      </div>
    </div>
  );
}
