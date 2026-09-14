import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  History,
  MessageSquareQuote,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FeedbackHistoryEntry, Task } from "@/shared/types";
import { EmptyValue, td } from "./task-detail-ui";
import { TaskDetailModal } from "./task-detail-overlay";

const LONG_FEEDBACK_CHARS = 480;

function formatDateTime(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso;
  return t.toLocaleString();
}

function FeedbackKindBadge({ kind }: { kind: FeedbackHistoryEntry["kind"] }) {
  const map: Record<FeedbackHistoryEntry["kind"], { label: string; className: string }> = {
    sent: {
      label: "Gửi lần đầu",
      className: "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900/60",
    },
    edit: {
      label: "Chỉnh sửa",
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/60",
    },
  };
  const { label, className } = map[kind];
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

function FeedbackHistoryList({ history }: { history: FeedbackHistoryEntry[] }) {
  const [viewEntry, setViewEntry] = useState<FeedbackHistoryEntry | null>(null);

  return (
    <>
      <ul className="divide-y divide-border">
        {[...history].reverse().map((h) => (
          <li key={h.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <FeedbackKindBadge kind={h.kind} />
                  <span className="font-medium text-foreground">{h.authorName}</span>
                  <span className="text-muted-foreground">{formatDateTime(h.createdAt)}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                  {h.content}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                aria-label="Xem nội dung feedback"
                onClick={() => setViewEntry(h)}
              >
                <Eye className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <TaskDetailModal
        open={viewEntry !== null}
        onClose={() => setViewEntry(null)}
        title="Nội dung feedback (lịch sử)"
        footer={
          viewEntry ? (
            <p className="text-xs text-muted-foreground">
              <FeedbackKindBadge kind={viewEntry.kind} /> · {viewEntry.authorName} ·{" "}
              {formatDateTime(viewEntry.createdAt)}
            </p>
          ) : undefined
        }
      >
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
          {viewEntry?.content}
        </p>
      </TaskDetailModal>
    </>
  );
}

type LatestFeedbackCardProps = {
  task: Task;
  canEdit?: boolean;
  onEditFeedback?: () => void;
  savedAt?: number | null;
};

/**
 * Latest PM feedback with max-height scroll, expand modal, and history accordion.
 */
export function LatestFeedbackCard({
  task,
  canEdit = false,
  onEditFeedback,
  savedAt,
}: LatestFeedbackCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const fbHistory = task.feedbackHistory ?? [];
  const text = (task.feedback ?? "").trim();
  const hasFeedback = text.length > 0;
  const isLong = text.length > LONG_FEEDBACK_CHARS;

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !hasFeedback) {
      setOverflows(false);
      return;
    }
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasFeedback, text]);

  if (!hasFeedback && fbHistory.length === 0 && !canEdit) return null;

  return (
    <>
      <Card className={td.feedbackCard}>
        <CardHeader className={td.feedbackHeader}>
          <CardTitle className="flex min-w-0 items-center gap-2 text-base font-semibold text-purple-700 dark:text-purple-300">
            <MessageSquareQuote className="size-5 shrink-0 text-purple-600 dark:text-purple-400" />
            <span className="truncate">Feedback mới nhất</span>
          </CardTitle>
          {canEdit && onEditFeedback && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-purple-200 bg-card text-purple-700 hover:bg-purple-500/10 dark:border-purple-900/60 dark:text-purple-300"
              onClick={onEditFeedback}
            >
              <Pencil className="size-4 mr-1" />
              Chỉnh sửa feedback
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {hasFeedback ? (
            <div className="relative">
              <div ref={bodyRef} className={td.feedbackScrollBody}>
                {text}
              </div>
              {(isLong || overflows) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-purple-50/50 dark:from-slate-900 to-transparent" />
              )}
            </div>
          ) : (
            <div className="px-5 py-4">
              <EmptyValue>
                {canEdit
                  ? 'Chưa có feedback. Nhấn "Chỉnh sửa feedback" để gửi cho thành viên.'
                  : "Chưa có feedback."}
              </EmptyValue>
            </div>
          )}

          {hasFeedback && (isLong || overflows) && (
            <div className="border-t border-border px-5 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                onClick={() => setFullOpen(true)}
              >
                Xem toàn bộ feedback
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-3 border-t border-border bg-purple-50/30 dark:bg-purple-950/20 px-5 py-3">
          {task.feedbackUpdatedAt && (
            <p className="text-xs text-muted-foreground">
              Cập nhật lúc {formatDateTime(task.feedbackUpdatedAt)}
            </p>
          )}
          {savedAt && (
            <p className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="size-3" /> Đã lưu
            </p>
          )}
          {fbHistory.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card dark:border-slate-800">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                aria-expanded={historyOpen}
              >
                <span className="flex items-center gap-2">
                  <History className="size-4" />
                  Lịch sử feedback ({fbHistory.length})
                </span>
                {historyOpen ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              {historyOpen && (
                <div className="max-h-64 overflow-y-auto border-t border-border">
                  <FeedbackHistoryList history={fbHistory} />
                </div>
              )}
            </div>
          )}
        </CardFooter>
      </Card>

      <TaskDetailModal
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        title="Feedback từ Project Manager"
        footer={
          task.feedbackUpdatedAt ? (
            <p className="text-xs text-muted-foreground">
              Cập nhật lúc {formatDateTime(task.feedbackUpdatedAt)}
            </p>
          ) : undefined
        }
      >
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
          {text}
        </p>
      </TaskDetailModal>
    </>
  );
}
