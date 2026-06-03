// File: src/features/tasks/components/user-response-editor.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircleHeart,
  Pencil,
  Plus,
  Send,
  Undo2,
  X,
  Loader2,
  Check,
} from "lucide-react";
import type { Task } from "@/shared/types";
import { Button } from "@/components/ui/button";
import {
  saveResponseDraft as saveDraftApi,
  sendResponse as sendResponseApi,
  undoResponse as undoResponseApi,
} from "@/shared/api";
import type { SendResponseResult } from "@/shared/api/client";

const DRAFT_DEBOUNCE_MS = 800;
const UNDO_WINDOW_MS = 6000;

type DraftStatus = "idle" | "saving" | "saved" | "error";

export type EditorMode = "first" | "edit" | "append";

export function pickEditorMode(task: Task): EditorMode {
  const history = task.userResponseHistory ?? [];
  if (history.length === 0) return "first";
  const sentAt = task.userResponseSentAt
    ? new Date(task.userResponseSentAt).getTime()
    : 0;
  const fbAt = task.feedbackUpdatedAt
    ? new Date(task.feedbackUpdatedAt).getTime()
    : 0;
  return fbAt > sentAt ? "append" : "edit";
}

interface UserResponseEditorProps {
  task: Task;
  /** Khi true, mặc định mở khu vực soạn (Detail page); false thì có nút mở (List page). */
  defaultOpen?: boolean;
  /** Tuỳ chọn class wrapper. */
  className?: string;
  /** Compact: ẩn label các trường, dùng trong list. */
  compact?: boolean;
}

export function UserResponseEditor({
  task,
  defaultOpen = false,
  className = "",
  compact = false,
}: UserResponseEditorProps) {
  const queryClient = useQueryClient();
  const mode = useMemo(() => pickEditorMode(task), [task]);

  const [open, setOpen] = useState<boolean>(defaultOpen);
  const initialDraft = useMemo(() => {
    if ((task.userResponseDraft ?? "") !== "") return task.userResponseDraft ?? "";
    if (mode === "edit") return task.userResponse ?? "";
    return "";
  }, [task.userResponseDraft, task.userResponse, mode]);
  const [draft, setDraft] = useState<string>(initialDraft);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<{
    token: string;
    expiresAt: number;
    kind: SendResponseResult["kind"];
  } | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Sync khi task đổi (vd. có entry mới từ server) — chỉ khi không có pending undo
  // và editor đang đóng (tránh đè text user đang gõ).
  useEffect(() => {
    if (pendingUndo) return;
    if (open) return;
    setDraft(initialDraft);
  }, [initialDraft, open, pendingUndo]);

  const saveDraftMut = useMutation({
    mutationFn: (value: string) => saveDraftApi(task.id, value),
    onMutate: () => {
      setDraftStatus("saving");
    },
    onSuccess: () => {
      setDraftStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
    },
    onError: (err) => {
      setDraftStatus("error");
      setError(err instanceof Error ? err.message : "Lưu nháp thất bại");
    },
  });

  // Debounced auto-save: chỉ chạy khi giá trị draft khác với task.userResponseDraft.
  const lastSavedRef = useRef<string>(task.userResponseDraft ?? "");
  useEffect(() => {
    lastSavedRef.current = task.userResponseDraft ?? "";
  }, [task.userResponseDraft]);

  useEffect(() => {
    if (!open) return;
    if (draft === lastSavedRef.current) return;
    if (mode === "edit" && draft === (task.userResponse ?? "")) return;
    const timer = setTimeout(() => {
      lastSavedRef.current = draft;
      saveDraftMut.mutate(draft);
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, open, mode]);

  const sendMut = useMutation({
    mutationFn: (content: string) => sendResponseApi(task.id, content),
    onSuccess: (res) => {
      setError(null);
      setOpen(false);
      setDraftStatus("idle");
      if (res.undoToken) {
        setPendingUndo({
          token: res.undoToken,
          expiresAt: Date.now() + UNDO_WINDOW_MS,
          kind: res.kind,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Gửi phản hồi thất bại");
    },
  });

  const undoMut = useMutation({
    mutationFn: (token: string) => undoResponseApi(task.id, token),
    onSuccess: (updated) => {
      setError(null);
      setPendingUndo(null);
      setOpen(true);
      setDraft(updated.userResponseDraft ?? "");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Hoàn tác thất bại");
      setPendingUndo(null);
    },
  });

  // Đếm ngược cho thanh undo.
  useEffect(() => {
    if (!pendingUndo) return;
    const tick = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(tick);
  }, [pendingUndo]);

  useEffect(() => {
    if (!pendingUndo) return;
    if (now >= pendingUndo.expiresAt) setPendingUndo(null);
  }, [now, pendingUndo]);

  const remainingMs = pendingUndo ? Math.max(0, pendingUndo.expiresAt - now) : 0;
  const remainingPct = pendingUndo
    ? Math.max(0, Math.min(100, (remainingMs / UNDO_WINDOW_MS) * 100))
    : 0;

  const handleSend = useCallback(() => {
    const v = draft.trim();
    if (!v) {
      setError("Nội dung phản hồi không được trống");
      return;
    }
    sendMut.mutate(v);
  }, [draft, sendMut]);

  const sendLabel =
    mode === "first" ? "Gửi cho PM" : mode === "edit" ? "Lưu chỉnh sửa" : "Gửi bổ sung";
  const openLabel =
    mode === "first" ? "Phản hồi" : mode === "edit" ? "Chỉnh sửa" : "Bổ sung phản hồi";
  const OpenIcon = mode === "append" ? Plus : Pencil;

  const isBusy = sendMut.isPending || undoMut.isPending;

  return (
    <div className={className}>
      {!open && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={
              compact
                ? "border-emerald-200 bg-white text-emerald-800 shadow-sm hover:bg-emerald-50"
                : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            }
            onClick={() => {
              setError(null);
              setOpen(true);
              setDraft(initialDraft);
            }}
            disabled={isBusy}
          >
            {mode === "first" ? (
              <MessageCircleHeart className="size-4 mr-1" />
            ) : (
              <OpenIcon className="size-4 mr-1" />
            )}
            {openLabel}
          </Button>
          {mode !== "first" && (
            <span className="text-xs text-muted-foreground">
              {mode === "append"
                ? "PM đã phản hồi — bạn có thể bổ sung"
                : "PM chưa phản hồi — có thể chỉnh sửa lần gửi gần nhất"}
            </span>
          )}
        </div>
      )}

      {open && (
        <div
          className={`rounded-xl border border-emerald-100 bg-emerald-50/40 shadow-sm ${
            compact ? "p-3" : "p-4"
          }`}
        >
          {!compact && (
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {mode === "first"
                  ? "Phản hồi tới Project Manager"
                  : mode === "edit"
                    ? "Chỉnh sửa phản hồi gần nhất"
                    : "Bổ sung phản hồi"}
              </p>
              <DraftIndicator status={draftStatus} />
            </div>
          )}
          <textarea
            className="max-h-[160px] min-h-[80px] w-full resize-y overflow-y-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-60"
            rows={compact ? 3 : 4}
            maxLength={5000}
            placeholder={
              mode === "append"
                ? "Bổ sung thông tin sau khi PM đã phản hồi..."
                : "Nhập tiến độ, vướng mắc hoặc câu hỏi của bạn..."
            }
            value={draft}
            disabled={isBusy}
            onChange={(e) => {
              setDraft(e.target.value);
              setDraftStatus("saving");
              setError(null);
            }}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{draft.length}/5000 ký tự</p>
            <div className="flex items-center gap-2">
              {compact && <DraftIndicator status={draftStatus} />}
              <Button
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
              >
                Huỷ
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isBusy || draft.trim() === ""}
                onClick={handleSend}
              >
                {sendMut.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="size-4 mr-1" />
                    {sendLabel}
                  </>
                )}
              </Button>
            </div>
          </div>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      )}

      {pendingUndo && (
        <UndoToast
          remainingMs={remainingMs}
          remainingPct={remainingPct}
          kind={pendingUndo.kind}
          isUndoing={undoMut.isPending}
          onUndo={() => undoMut.mutate(pendingUndo.token)}
          onDismiss={() => setPendingUndo(null)}
        />
      )}
    </div>
  );
}

function DraftIndicator({ status }: { status: DraftStatus }) {
  if (status === "idle") return null;
  if (status === "saving")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Đang lưu nháp…
      </span>
    );
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
        <Check className="size-3" />
        Bản nháp đã lưu
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive">
      Lưu nháp thất bại
    </span>
  );
}

function UndoToast({
  remainingMs,
  remainingPct,
  kind,
  isUndoing,
  onUndo,
  onDismiss,
}: {
  remainingMs: number;
  remainingPct: number;
  kind: SendResponseResult["kind"];
  isUndoing: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const seconds = Math.ceil(remainingMs / 1000);
  const headline =
    kind === "sent"
      ? "Đã gửi phản hồi cho PM"
      : kind === "edit"
        ? "Đã lưu chỉnh sửa phản hồi"
        : "Đã gửi bổ sung phản hồi";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[60] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border-2 border-emerald-500 bg-white shadow-[0_20px_60px_-15px_rgba(16,185,129,0.45)] ring-4 ring-emerald-500/20 animate-in fade-in slide-in-from-right-4 duration-300"
    >
      <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2.5 text-white">
        <Check className="size-5" />
        <p className="flex-1 text-sm font-semibold">{headline}</p>
        <button
          type="button"
          aria-label="Đóng"
          className="rounded p-1 text-white/80 hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
          onClick={onDismiss}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          Có thể hoàn tác trong {seconds}s.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          disabled={isUndoing}
          onClick={onUndo}
        >
          {isUndoing ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <Undo2 className="size-4 mr-1" />
          )}
          Hoàn tác
        </Button>
      </div>
      <div className="h-1 w-full bg-emerald-100">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${remainingPct}%` }}
        />
      </div>
    </div>
  );
}
