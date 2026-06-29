// File: src/features/tasks/pages/task-detail-page.tsx
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTask } from "../hooks/use-task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUsers, userUpdateTask } from "@/shared/api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { ResponseHistoryEntry, Task, TaskStatus } from "@/shared/types";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  History,
  MessageCircleHeart,
  Pencil,
} from "lucide-react";
import { AdminTaskEditDrawer } from "../components/admin-task-edit-drawer";
import { FeedbackEditDrawer } from "../components/feedback-edit-drawer";
import { parseTaskReturnTo } from "../hooks/use-task-list-filters";
import { LatestFeedbackCard } from "../components/feedback-latest-card";
import {
  UserResponseEditor,
  pickEditorMode,
} from "../components/user-response-editor";
import {
  DeadlineBadge,
  DetailField,
  EmptyValue,
  PriorityBadge,
  StatusBadge,
  td,
} from "../components/task-detail-ui";

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = parseTaskReturnTo(searchParams.get("returnTo"));
  const queryClient = useQueryClient();
  const { data: task, isLoading, isError } = useTask(id);
  const { user, isAdmin } = useAuth();
  const { data: users = [] } = useQuery({
    queryKey: ["users", "task-detail-assignee"],
    queryFn: getUsers,
    enabled: isAdmin,
  });

  const canEdit =
    !!task &&
    !!user &&
    (task.assigneeId === user.id || (task.collaboratorIds ?? []).includes(user.id));

  const [statusError, setStatusError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const [feedbackEditOpen, setFeedbackEditOpen] = useState(false);
  const [feedbackSavedAt, setFeedbackSavedAt] = useState<number | null>(null);

  const statusMut = useMutation({
    mutationFn: (next: TaskStatus) =>
      userUpdateTask(task!.id, { status: next }),
    onSuccess: () => {
      setStatusError(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task?.id] });
    },
    onError: (err) => {
      setStatusError(err instanceof Error ? err.message : "Cập nhật status thất bại");
    },
  });

  const assigneeDisplay =
    task?.assigneeId == null
      ? "Unassigned"
      : task.assigneeName != null && task.assigneeName !== ""
        ? task.assigneeName
        : task.assigneeId === user?.id
          ? user?.fullName ?? task.assigneeId
          : users.find((u) => u.id === task.assigneeId)?.fullName ?? task.assigneeId;

  const goBackToTasks = () => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(isAdmin ? "/admin/tasks" : "/tasks");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Task not found or failed to load.</p>
          <Button variant="outline" className="mt-4" onClick={goBackToTasks}>
            Back to tasks
          </Button>
        </CardContent>
      </Card>
    );
  }

  const editorMode = pickEditorMode(task);
  const history = task.userResponseHistory ?? [];
  const projectLabel =
    task.projectName ??
    (task.projectId ? task.projectId : null);
  const hasFeedbackSection =
    isAdmin ||
    (task.feedback ?? "").trim() !== "" ||
    (task.feedbackHistory ?? []).length > 0;
  const showTwoColumn = isAdmin || hasFeedbackSection;

  return (
    <div className={td.page}>
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 shrink-0 text-[#6B7280] hover:bg-blue-50 hover:text-blue-700"
              onClick={goBackToTasks}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px]">
                {task.title}
              </h1>
              <p className={td.muted}>
                {projectLabel ?? "Note cá nhân"} · {assigneeDisplay}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button
              className={`${td.primaryBtn} hidden shrink-0 sm:inline-flex`}
              onClick={() => setAdminDrawerOpen(true)}
            >
              <Pencil className="size-4 mr-2" />
              Chỉnh sửa task
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-11 sm:pl-12">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <DeadlineBadge deadline={task.deadline} />
        </div>
      </header>

      <div className={showTwoColumn ? td.twoCol : td.stack}>
        <div className={`${td.stack} order-1`}>
          <TaskDetailsCard task={task} assigneeDisplay={assigneeDisplay} />

          {canEdit && (
            <UserUpdateCard
              task={task}
              editorMode={editorMode}
              history={history}
              historyOpen={historyOpen}
              setHistoryOpen={setHistoryOpen}
              statusMut={statusMut}
              statusError={statusError}
            />
          )}

          {!canEdit && (
            <UserResponseReadonlyCard
              task={task}
              history={history}
              historyOpen={historyOpen}
              setHistoryOpen={setHistoryOpen}
            />
          )}
        </div>

        {(isAdmin || hasFeedbackSection) && (
          <aside className={`${td.stack} order-2`}>
            <LatestFeedbackCard
              task={task}
              canEdit={isAdmin}
              savedAt={feedbackSavedAt}
              onEditFeedback={
                isAdmin ? () => setFeedbackEditOpen(true) : undefined
              }
            />
            {isAdmin && (
              <Button
                className={`${td.primaryBtn} w-full sm:hidden`}
                onClick={() => setAdminDrawerOpen(true)}
              >
                <Pencil className="size-4 mr-2" />
                Chỉnh sửa task
              </Button>
            )}
          </aside>
        )}
      </div>

      {isAdmin && (
        <>
          <AdminTaskEditDrawer
            open={adminDrawerOpen}
            onClose={() => setAdminDrawerOpen(false)}
            task={task}
          />
          <FeedbackEditDrawer
            open={feedbackEditOpen}
            onClose={() => setFeedbackEditOpen(false)}
            task={task}
            onSaved={() => setFeedbackSavedAt(Date.now())}
          />
        </>
      )}
    </div>
  );
}

function TaskDetailsCard({
  task,
  assigneeDisplay,
}: {
  task: Task;
  assigneeDisplay: string;
}) {
  const hasDescription = (task.description ?? "").trim() !== "";
  const hasCollaborators = (task.collaborators ?? []).length > 0;

  return (
    <Card className={td.surfaceCard}>
      <CardHeader className={td.cardHeader}>
        <CardTitle className="text-lg text-gray-900">Details</CardTitle>
      </CardHeader>
      <CardContent className={td.cardBody}>
        <div className="grid gap-5 sm:grid-cols-2">
          <DetailField label="Title">
            <p className="font-medium text-gray-900">{task.title}</p>
          </DetailField>
          <DetailField label="Project">
            {(task.projectName ?? task.projectId) ? (
              <p className="text-gray-900">
                {task.projectName ?? task.projectId}
              </p>
            ) : (
              <EmptyValue>Note cá nhân — không thuộc project</EmptyValue>
            )}
          </DetailField>
        </div>
        <DetailField label="Description">
          {hasDescription ? (
            <p className="whitespace-pre-wrap break-words text-gray-900">
              {task.description}
            </p>
          ) : (
            <EmptyValue>Chưa có mô tả.</EmptyValue>
          )}
        </DetailField>
        <div className="grid gap-5 sm:grid-cols-2">
          <DetailField label="Assignee">
            <p className="text-gray-900">{assigneeDisplay}</p>
          </DetailField>
          <DetailField label="Collaborators">
            {hasCollaborators ? (
              <p className="text-gray-900">
                {task.collaborators!.map((c) => c.fullName).join(", ")}
              </p>
            ) : (
              <EmptyValue>Chưa có collaborators.</EmptyValue>
            )}
          </DetailField>
        </div>
      </CardContent>
    </Card>
  );
}

function UserUpdateCard({
  task,
  editorMode,
  history,
  historyOpen,
  setHistoryOpen,
  statusMut,
  statusError,
}: {
  task: Task;
  editorMode: ReturnType<typeof pickEditorMode>;
  history: ResponseHistoryEntry[];
  historyOpen: boolean;
  setHistoryOpen: Dispatch<SetStateAction<boolean>>;
  statusMut: { isPending: boolean; mutate: (s: TaskStatus) => void };
  statusError: string | null;
}) {
  return (
    <Card className={td.userCard}>
      <CardHeader className={td.cardHeader}>
        <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
          <MessageCircleHeart className="size-5 text-emerald-600" />
          Cập nhật từ tôi
        </CardTitle>
      </CardHeader>
      <CardContent className={td.cardBody}>
        <div className="grid gap-2 sm:grid-cols-[120px,1fr] sm:items-center">
          <p className={td.detailLabel}>Status</p>
          <select
            aria-label="Status"
            className={`${td.select} max-w-xs`}
            value={task.status}
            disabled={statusMut.isPending}
            onChange={(e) => {
              const next = e.target.value as TaskStatus;
              if (next !== task.status) statusMut.mutate(next);
            }}
          >
            <option value="Todo">Todo</option>
            <option value="InProgress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>
        {statusError && <p className="text-xs text-destructive">{statusError}</p>}

        {task.userResponse && task.userResponse.trim() !== "" && (
          <div className="rounded-xl border border-emerald-100 bg-white p-4">
            <p className={td.sectionTitle}>Phản hồi đã gửi</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-gray-900">
              {task.userResponse}
            </p>
            {task.userResponseSentAt && (
              <p className="mt-2 text-xs text-[#6B7280]">
                Gửi lúc {formatDateTime(task.userResponseSentAt)}
                {editorMode === "append" && (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 ring-1 ring-amber-200">
                    PM đã phản hồi sau khi bạn gửi
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        <UserResponseEditor task={task} defaultOpen={false} />

        {history.length > 0 && (
          <HistoryToggle
            label={`Lịch sử phản hồi (${history.length})`}
            open={historyOpen}
            onToggle={() => setHistoryOpen((v) => !v)}
            tone="emerald"
          >
            <ResponseHistoryList history={history} />
          </HistoryToggle>
        )}
      </CardContent>
    </Card>
  );
}

function UserResponseReadonlyCard({
  task,
  history,
  historyOpen,
  setHistoryOpen,
}: {
  task: Task;
  history: ResponseHistoryEntry[];
  historyOpen: boolean;
  setHistoryOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const hasResponse = (task.userResponse ?? "").trim() !== "";
  if (!hasResponse && history.length === 0) return null;

  return (
    <Card className={td.userCard}>
      <CardHeader className={td.cardHeader}>
        <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
          <MessageCircleHeart className="size-5 text-emerald-600" />
          Phản hồi từ thành viên thực hiện
        </CardTitle>
      </CardHeader>
      <CardContent className={td.cardBody}>
        {hasResponse ? (
          <p className="whitespace-pre-wrap break-words text-gray-900">
            {task.userResponse}
          </p>
        ) : (
          <EmptyValue>Chưa có phản hồi từ người thực hiện.</EmptyValue>
        )}
        {task.userResponseSentAt && (
          <p className="text-xs text-[#6B7280]">
            Gửi lúc {formatDateTime(task.userResponseSentAt)}
          </p>
        )}
        {history.length > 0 && (
          <HistoryToggle
            label={`Lịch sử phản hồi (${history.length})`}
            open={historyOpen}
            onToggle={() => setHistoryOpen((v) => !v)}
            tone="emerald"
          >
            <ResponseHistoryList history={history} />
          </HistoryToggle>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryToggle({
  label,
  open,
  onToggle,
  tone,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  tone: "emerald" | "violet";
  children: ReactNode;
}) {
  const styles =
    tone === "emerald"
      ? "border-emerald-100 text-emerald-900 hover:bg-emerald-50/80 focus:ring-emerald-400"
      : "border-violet-100 text-violet-900 hover:bg-violet-50/80 focus:ring-violet-400";
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 ${styles}`}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <History className="size-4" />
          {label}
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && children}
    </div>
  );
}

function ResponseHistoryList({ history }: { history: ResponseHistoryEntry[] }) {
  return (
    <ul className="divide-y divide-gray-100">
      {[...history].reverse().map((h) => (
        <li key={h.id} className="px-4 py-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-2">
              <KindBadge kind={h.kind} />
              <span className="font-medium text-gray-900">{h.authorName}</span>
            </span>
            <span className="text-[#6B7280]">{formatDateTime(h.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">
            {h.content}
          </p>
        </li>
      ))}
    </ul>
  );
}

function KindBadge({ kind }: { kind: ResponseHistoryEntry["kind"] }) {
  const map: Record<ResponseHistoryEntry["kind"], { label: string; className: string }> = {
    sent: {
      label: "Gửi lần đầu",
      className: "bg-emerald-100 text-emerald-800 border-emerald-300",
    },
    edit: {
      label: "Chỉnh sửa",
      className: "bg-sky-100 text-sky-800 border-sky-300",
    },
    append: {
      label: "Bổ sung",
      className: "bg-amber-100 text-amber-800 border-amber-300",
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

function formatDateTime(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso;
  return t.toLocaleString();
}
