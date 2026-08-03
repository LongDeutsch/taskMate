// File: src/features/automation/pages/automation-page.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getHookEvents, type HookEventItem } from "@/shared/api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getRoleLabel } from "@/shared/types";
import { Navigate } from "react-router-dom";
import { getHomePathForUser } from "@/app/config/nav-items";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  Radio,
  Eye,
  X,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

function statusMeta(status: string) {
  switch (status) {
    case "failed":
      return {
        label: "Thất bại",
        className: "bg-red-50 text-red-700 border-red-200",
        Icon: XCircle,
      };
    case "running":
      return {
        label: "Đang chạy",
        className: "bg-amber-50 text-amber-800 border-amber-200",
        Icon: Loader2,
      };
    default:
      return {
        label: "Thành công",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        Icon: CheckCircle2,
      };
  }
}

function formatWhen(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diff = Date.now() - t;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  return new Date(iso).toLocaleString("vi-VN");
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm text-gray-900 break-words whitespace-pre-wrap", mono && "font-mono text-xs")}>
        {value || "—"}
      </p>
    </div>
  );
}

function HookEventDetailModal({
  event,
  onClose,
}: {
  event: HookEventItem;
  onClose: () => void;
}) {
  const meta = statusMeta(event.status);
  const Icon = meta.Icon;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết webhook"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
          <div className="min-w-0 space-y-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                meta.className
              )}
            >
              <Icon className={cn("size-3.5", event.status === "running" && "animate-spin")} />
              {meta.label}
            </span>
            <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <DetailRow label="Nguồn (source)" value={event.source} />
          <DetailRow label="Nội dung (message)" value={event.message} />
          <DetailRow label="Trạng thái" value={event.status} />
          <DetailRow label="jobId" value={event.jobId} mono />
          <DetailRow
            label="Đã gửi thông báo"
            value={`${event.notifiedCount ?? 0} user có mục Automation`}
          />
          <DetailRow
            label="Thời gian"
            value={
              event.createdAt
                ? `${formatWhen(event.createdAt)} · ${new Date(event.createdAt).toLocaleString("vi-VN")}`
                : "—"
            }
          />
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          <Button type="button" className="w-full" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

function HookEventCard({
  event,
  onOpenDetail,
}: {
  event: HookEventItem;
  onOpenDetail: (event: HookEventItem) => void;
}) {
  const meta = statusMeta(event.status);
  const Icon = meta.Icon;
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                  meta.className
                )}
              >
                <Icon className={cn("size-3.5", event.status === "running" && "animate-spin")} />
                {meta.label}
              </span>
              {event.source && (
                <span className="text-xs text-muted-foreground">{event.source}</span>
              )}
            </div>
            <p className="font-medium text-gray-900">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              jobId: <span className="font-mono">{event.jobId}</span>
              {typeof event.notifiedCount === "number"
                ? ` · đã báo ${event.notifiedCount} user`
                : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 border-gray-200"
              title="Xem chi tiết webhook"
              aria-label="Xem chi tiết webhook"
              onClick={() => onOpenDetail(event)}
            >
              <Eye className="size-4" />
            </Button>
            <time className="text-xs text-muted-foreground">
              {formatWhen(event.createdAt)}
            </time>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AutomationPage() {
  const { user } = useAuth();
  const roleLabel = user ? getRoleLabel(user) : "STAFF";
  const canAccess = roleLabel !== "HR";
  const [detail, setDetail] = useState<HookEventItem | null>(null);

  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ["hook-events"],
    queryFn: () => getHookEvents({ limit: 100 }),
    enabled: canAccess,
    refetchInterval: 15_000,
  });

  if (!canAccess) {
    return <Navigate to={getHomePathForUser(user)} replace />;
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-28 md:pb-0">
      <div className="min-w-0">
        <h1 className="text-xl font-bold sm:text-2xl">Automation</h1>
        <p className="text-muted-foreground">
          Thông báo từ webhook (crawl / job bên ngoài). Mọi user có mục Automation đều xem và
          nhận được.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="size-4 text-blue-600" />
            Sự kiện webhook gần đây
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-blue-600" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-red-600">
              Không tải được danh sách sự kiện. Thử lại sau.
            </p>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Zap className="mb-4 size-12 opacity-50" />
              <p className="font-medium">Chưa có sự kiện webhook</p>
              <p className="mt-1 text-sm">
                Khi PC crawl gọi <code className="text-xs">POST /api/hooks/events</code>, sự kiện
                sẽ hiện tại đây.
              </p>
            </div>
          ) : (
            events.map((event) => (
              <HookEventCard key={event.id} event={event} onOpenDetail={setDetail} />
            ))
          )}
        </CardContent>
      </Card>

      {detail && (
        <HookEventDetailModal event={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
