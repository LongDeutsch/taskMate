import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import type { AppNotification, NotificationType } from "@/shared/types";
import { Button } from "@/components/ui/button";
import { useNotifications } from "../hooks/use-notifications";

function labelForType(type: NotificationType): string {
  switch (type) {
    case "task_assigned":
      return "đã giao cho bạn task";
    case "task_reassigned":
      return "đã chuyển task sang bạn";
    case "task_collaborator":
      return "đã thêm bạn làm collaborator của task";
    case "task_updated":
      return "đã cập nhật task";
    case "task_user_update":
      return "đã cập nhật task được giao";
    case "deadline_reminder":
      return "nhắc deadline task";
    case "overdue_alert":
      return "cảnh báo task quá hạn";
    case "time_off_submitted":
      return "đã gửi yêu cầu xin off";
    case "time_off_status_updated":
      return "đã cập nhật trạng thái yêu cầu xin off";
    case "external_job":
      return "báo cáo job / crawl";
    default:
      return "có cập nhật";
  }
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { items, unreadCount, isLoading, markRead, markAll } = useNotifications();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleClick(n: AppNotification) {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.type === "time_off_submitted" || n.type === "time_off_status_updated") {
      navigate("/time-off");
      return;
    }
    if (n.type === "external_job") {
      navigate("/dashboard");
      return;
    }
    if (n.taskId) navigate(`/tasks/${n.taskId}`);
  }

  return (
    <div ref={wrapRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} chưa đọc)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className={`size-5 ${unreadCount > 0 ? "text-indigo-600" : ""}`} />
        {unreadCount > 0 && (
          <>
            <span className="absolute -right-0.5 -top-0.5 inline-flex size-4 animate-ping rounded-full bg-indigo-500 opacity-60" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white ring-2 ring-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border-2 border-indigo-500 bg-white text-popover-foreground shadow-[0_10px_40px_-10px_rgba(79,70,229,0.55)] ring-2 ring-indigo-500/15 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 px-3 py-2 text-white">
            <p className="text-sm font-semibold">
              Thông báo {unreadCount > 0 && <span className="ml-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">{unreadCount}</span>}
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 rounded px-1 text-xs text-white/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
                onClick={() => markAll()}
              >
                <CheckCheck className="size-3.5" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto bg-gradient-to-b from-indigo-50 to-white">
            {isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-indigo-700/70">Đang tải…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-indigo-700/70">
                Chưa có thông báo nào.
              </p>
            ) : (
              <ul className="divide-y divide-indigo-200">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors focus:outline-none ${
                        n.read
                          ? "bg-white/60 text-foreground hover:bg-indigo-50 focus:bg-indigo-50"
                          : "border-l-4 border-l-indigo-500 bg-indigo-100 text-indigo-950 hover:bg-indigo-200/80 focus:bg-indigo-200/80"
                      }`}
                    >
                      <div className="flex w-full items-start gap-2">
                        {!n.read && (
                          <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-indigo-600" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate">
                            <span className={`font-semibold ${n.read ? "" : "text-indigo-900"}`}>
                              {n.actorName || "Hệ thống"}
                            </span>{" "}
                            <span className={n.read ? "text-muted-foreground" : "text-indigo-800/80"}>
                              {labelForType(n.type)}
                              {n.taskTitle ? ":" : ""}
                            </span>{" "}
                            {n.taskTitle && (
                              <span className="font-semibold">{n.taskTitle}</span>
                            )}
                          </p>
                          {n.changeSummary && (
                            <p
                              className={`truncate text-xs ${
                                n.read ? "text-muted-foreground" : "text-indigo-800 font-medium"
                              }`}
                            >
                              {n.changeSummary}
                            </p>
                          )}
                          <p
                            className={`text-xs ${
                              n.read ? "text-muted-foreground" : "text-indigo-700/80"
                            }`}
                          >
                            {formatRelative(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
