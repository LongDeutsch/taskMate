// File: src/features/automation/pages/automation-page.tsx
import { useQuery } from "@tanstack/react-query";
import { getHookEvents, type HookEventItem } from "@/shared/api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getRoleLabel } from "@/shared/types";
import { Navigate } from "react-router-dom";
import { getHomePathForUser } from "@/app/config/nav-items";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Zap, CheckCircle2, XCircle, Loader2, Radio } from "lucide-react";
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

function HookEventCard({ event }: { event: HookEventItem }) {
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
            {event.message && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {event.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              jobId: <span className="font-mono">{event.jobId}</span>
              {typeof event.notifiedCount === "number"
                ? ` · đã báo ${event.notifiedCount} user`
                : ""}
            </p>
          </div>
          <time className="shrink-0 text-xs text-muted-foreground sm:pt-1">
            {formatWhen(event.createdAt)}
          </time>
        </div>
      </CardContent>
    </Card>
  );
}

export function AutomationPage() {
  const { user } = useAuth();
  const roleLabel = user ? getRoleLabel(user) : "STAFF";
  const canAccess = roleLabel !== "HR";

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
            events.map((event) => <HookEventCard key={event.id} event={event} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
