// File: src/features/time-off/pages/time-off-page.tsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CalendarOff,
  CheckCircle2,
  Clock4,
  Download,
  Eye,
  EyeOff,
  FileText,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Star,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import {
  cancelTimeOff,
  createMailJob,
  getProfile,
  updateProfile,
  submitMailJobCredentials,
  waitForMailJob,
  wakeApi,
  getAllTimeOffs,
  getMyTimeOffs,
  getTimeOffRecipients,
  getUsers,
  setTimeOffStatus,
} from "@/shared/api";
import type { MailJobItem } from "@/shared/api";
import {
  buildMailDraftFromForm,
  DEFAULT_MAIL_TEMPLATE,
  mergeMailTemplate,
  textToSimpleHtml,
  type MailTemplateConfig,
} from "@/features/time-off/lib/time-off-email";
import {
  formatRoleLabel,
  formatTimeOffReason,
  formatTimeOffSession,
  getRoleLabel,
  type BusinessTripScheduleItem,
  type TimeOffExtraRecipient,
  type TimeOffReason,
  type TimeOffRequest,
  type TimeOffSession,
  type TimeOffStatus,
} from "@/shared/types";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  downloadTimeOffXlsx,
  expandTimeOffToExportRows,
} from "@/features/time-off/lib/export-time-off-xlsx";
import { filterTimeOffByCreatedDate } from "@/features/time-off/lib/filter-by-created-date";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { toast } from "@/shared/lib/toast";
import { DatePicker } from "@/shared/components/date-picker";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DeleteConfirmState =
  | { kind: "one"; id: string }
  | { kind: "all" }
  | null;

const SESSION_OPTIONS: { value: TimeOffSession; label: string }[] = [
  { value: "MORNING", label: "Buổi sáng" },
  { value: "AFTERNOON", label: "Buổi chiều" },
  { value: "FULL", label: "Cả ngày" },
];

const REASON_OPTIONS: { value: TimeOffReason; label: string }[] = [
  { value: "ANNUAL_LEAVE", label: "Nghỉ phép năm" },
  { value: "WFH", label: "Work from home (WFH)" },
  { value: "LATE_ARRIVAL", label: "Xin đi trễ" },
  { value: "EARLY_LEAVE", label: "Xin về sớm" },
  { value: "BUSINESS_TRIP", label: "Đi công tác" },
  { value: "OTHER", label: "Lý do khác" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyScheduleRow(): BusinessTripScheduleItem {
  const d = todayIso();
  return { startDate: d, endDate: d, staff: "", location: "", description: "" };
}

function normalizeIsoDateOnly(value: string) {
  return String(value).slice(0, 10);
}

function formatDateViDisplay(iso: string) {
  const raw = normalizeIsoDateOnly(iso);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatScheduleDateRange(startDate: string, endDate: string) {
  const start = normalizeIsoDateOnly(startDate);
  const end = normalizeIsoDateOnly(endDate);
  if (start === end) return `Ngày ${formatDateViDisplay(start)}`;
  return `Từ ${formatDateViDisplay(start)} đến ${formatDateViDisplay(end)}`;
}

function BusinessTripScheduleList({ items }: { items: BusinessTripScheduleItem[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-amber-200/80 bg-amber-50/50 p-2.5 text-xs dark:border-amber-900/50 dark:bg-amber-950/20">
      <p className="font-semibold text-amber-900 dark:text-amber-300">Lịch trình công tác ({items.length} chặng):</p>
      {items.map((row, idx) => (
        <div key={idx} className="flex flex-col gap-0.5 rounded bg-card/80 p-2 border border-amber-100 dark:border-amber-900/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 text-foreground">
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {formatScheduleDateRange(row.startDate, row.endDate)}
            </span>
            <span>·</span>
            <span className="font-medium">{row.staff}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            {row.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3 text-amber-600 dark:text-amber-400" />
                {row.location}
              </span>
            )}
            {row.description && (
              <span className="text-muted-foreground truncate max-w-xs">
                — {row.description}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: TimeOffStatus }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800">
        <CheckCircle2 className="size-3.5" /> Đã duyệt
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800">
        <XCircle className="size-3.5" /> Từ chối
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800">
      <Clock4 className="size-3.5" /> Chờ duyệt
    </span>
  );
}

function RequestCard({
  req,
  showOwner,
  canDelete,
  canDecide,
  onDelete,
  onDecide,
}: {
  req: TimeOffRequest;
  showOwner: boolean;
  canDelete: boolean;
  canDecide: boolean;
  onDelete: (id: string) => void;
  onDecide: (id: string, status: "approved" | "rejected") => void;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-border/80 hover:shadow dark:border-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Requester Header */}
          {showOwner && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="flex size-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60 font-semibold text-blue-700 dark:text-blue-300 text-xs">
                {req.userName?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="font-semibold text-foreground leading-tight">{req.userName}</span>
              {req.userRoleLabel && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {formatRoleLabel(req.userRoleLabel)}
                </span>
              )}
            </div>
          )}

          {/* Time and Reason Details */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <Calendar className="size-3.5" />
              {formatDateViDisplay(req.startDate)}
              {req.startDate !== req.endDate && (
                <>
                  <span className="text-blue-400">→</span>
                  {formatDateViDisplay(req.endDate)}
                </>
              )}
            </span>
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
              {formatTimeOffSession(req.session)}
            </span>
            <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              {formatTimeOffReason(req.reason)}
            </span>
            {req.reason === "OTHER" && req.reasonOther && (
              <span className="text-xs text-muted-foreground italic">
                ({req.reasonOther})
              </span>
            )}
          </div>

          {/* Business Trip Schedule */}
          {req.reason === "BUSINESS_TRIP" && req.businessTripSchedule?.length ? (
            <BusinessTripScheduleList items={req.businessTripSchedule} />
          ) : null}

          {/* Additional details */}
          {req.details ? (
            <div className="rounded-md border-l-2 border-border bg-muted/40 px-3 py-2 text-xs text-foreground whitespace-pre-wrap dark:border-slate-700">
              {req.details}
            </div>
          ) : null}

          {/* Meta footer */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>Tạo lúc: {new Date(req.createdAt).toLocaleString("vi-VN")}</span>
            {req.recipients && req.recipients.length > 0 && (
              <span>
                Người nhận: <span className="font-medium text-foreground">{req.recipients.map((r) => r.fullName).join(", ")}</span>
              </span>
            )}
            {req.status !== "pending" && req.decidedByName && (
              <span className="font-medium text-foreground">
                {req.status === "approved" ? "✓ Đã duyệt bởi:" : "✗ Từ chối bởi:"} {req.decidedByName}
              </span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex shrink-0 items-center gap-2 self-start">
          <StatusBadge status={req.status} />
        </div>
      </div>

      {/* Action buttons */}
      {(canDelete || (canDecide && req.status === "pending")) && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          {canDecide && req.status === "pending" && (
            <>
              <Button
                size="sm"
                className="h-8 bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                onClick={() => onDecide(req.id, "approved")}
              >
                <CheckCircle2 className="size-3.5 mr-1" />
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-rose-200 dark:border-rose-900/60 px-3 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                onClick={() => onDecide(req.id, "rejected")}
              >
                <XCircle className="size-3.5 mr-1" />
                Từ chối
              </Button>
            </>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDelete(req.id)}
              className="h-8 px-2.5 text-muted-foreground hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              title="Xóa đơn"
            >
              <Trash2 className="size-3.5 mr-1" />
              Xóa đơn
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function TimeOffPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const roleLabel = user ? getRoleLabel(user) : "STAFF";
  const canViewAll = roleLabel === "HR" || roleLabel === "ADMIN";

  // Tab state
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "mine">("all");
  const [statusFilter, setStatusFilter] = useState<TimeOffStatus | "">("");

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    startDate: todayIso(),
    endDate: todayIso(),
    session: "FULL" as TimeOffSession,
    reason: "ANNUAL_LEAVE" as TimeOffReason,
    reasonOther: "",
    details: "",
    businessTripSchedule: [] as BusinessTripScheduleItem[],
    recipientIds: [] as string[],
  });

  const [filterUserId, setFilterUserId] = useState("");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [filterError, setFilterError] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);

  const [isWakingApi, setIsWakingApi] = useState(false);
  const [isSubmittingMailJob, setIsSubmittingMailJob] = useState(false);
  const [jobStatusLabel, setJobStatusLabel] = useState<string | null>(null);
  const [credentialsJobId, setCredentialsJobId] = useState<string | null>(null);
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [showCredPassword, setShowCredPassword] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [isSubmittingCreds, setIsSubmittingCreds] = useState(false);

  const [draftSubject, setDraftSubject] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftDirty, setDraftDirty] = useState(false);
  const [mailTpl, setMailTpl] = useState<MailTemplateConfig>({ ...DEFAULT_MAIL_TEMPLATE });
  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [tplDraft, setTplDraft] = useState<MailTemplateConfig>({ ...DEFAULT_MAIL_TEMPLATE });
  const [tplSaving, setTplSaving] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);
  const [draftExpanded, setDraftExpanded] = useState(false);
  const [extraRecipients, setExtraRecipients] = useState<TimeOffExtraRecipient[]>([]);
  const [selectedExtraEmails, setSelectedExtraEmails] = useState<string[]>([]);
  const [extraEmailInput, setExtraEmailInput] = useState("");
  const [extraEmailError, setExtraEmailError] = useState<string | null>(null);
  const [extraSaving, setExtraSaving] = useState(false);
  const [extraDefaultsReady, setExtraDefaultsReady] = useState(false);

  const recipientQuery = useQuery({
    queryKey: ["time-off", "recipients"],
    queryFn: getTimeOffRecipients,
  });

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: getProfile,
    enabled: !!user,
  });

  const myQuery = useQuery({
    queryKey: ["time-off", "mine"],
    queryFn: getMyTimeOffs,
  });

  const allQuery = useQuery({
    queryKey: ["time-off", "all"],
    queryFn: () => getAllTimeOffs(),
    enabled: canViewAll,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: canViewAll,
  });

  const userFilterOptions = useMemo(() => {
    return (usersQuery.data ?? [])
      .filter((u) => !u.disabled && !u.deletedAt)
      .map((u) => ({ id: u.id, name: u.fullName || u.username }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [usersQuery.data]);

  const filterUserName = useMemo(() => {
    if (!filterUserId) return null;
    return userFilterOptions.find((u) => u.id === filterUserId)?.name ?? null;
  }, [filterUserId, userFilterOptions]);

  const hrRecipientIds = useMemo(
    () => (recipientQuery.data ?? []).map((r) => r.id),
    [recipientQuery.data]
  );

  const pendingCount = useMemo(() => {
    return (allQuery.data ?? []).filter((item) => item.status === "pending").length;
  }, [allQuery.data]);

  const createMutation = useMutation({
    mutationFn: async (payload: {
      startDate: string;
      endDate: string;
      session: TimeOffSession;
      reason: TimeOffReason;
      reasonOther?: string;
      details?: string;
      businessTripSchedule?: BusinessTripScheduleItem[];
      recipientIds: string[];
      additionalEmails?: string[];
      mailDraft: { subject: string; text: string; html: string };
    }) => {
      const job = await createMailJob(payload);
      setJobStatusLabel("Đã tạo job — đang chờ máy trạm nhận...");
      let current = await waitForMailJob(job.id, {
        onUpdate: (j) => {
          const map: Record<string, string> = {
            queued: "Đang chờ máy trạm nhận job...",
            claimed: "Máy trạm đã nhận — đang kiểm tra tài khoản...",
            need_credentials: "Máy trạm cần cấu hình email/mật khẩu...",
            sending: "Đang gửi mail từ máy trạm...",
            sent: "Đã gửi mail thành công",
            failed: "Gửi mail thất bại",
          };
          setJobStatusLabel(map[j.status] ?? j.status);
        },
      });

      if (current.status === "need_credentials") {
        setCredentialsJobId(current.id);
        setCredEmail("");
        setCredPassword("");
        setShowCredPassword(false);
        setCredError(current.error || null);
        current = await waitForMailJob(current.id, {
          timeoutMs: 180_000,
          continueWhileNeedCredentials: true,
          onUpdate: (j) => {
            if (j.status === "need_credentials") {
              setCredentialsJobId(j.id);
              if (j.error) setCredError(j.error);
            } else if (j.status === "sending") {
              setCredentialsJobId(null);
              setCredError(null);
            } else if (j.status === "sent" || j.status === "failed") {
              setCredentialsJobId(null);
            }
            const map: Record<string, string> = {
              queued: "Đang chờ máy trạm...",
              claimed: "Máy trạm đã nhận...",
              need_credentials: j.error
                ? "Sai email/mật khẩu — vui lòng nhập lại"
                : "Vui lòng nhập email/mật khẩu webmail",
              sending: "Đang gửi mail từ máy trạm...",
              sent: "Đã gửi mail thành công",
              failed: "Gửi mail thất bại",
            };
            setJobStatusLabel(map[j.status] ?? j.status);
          },
        });
      }
      return current;
    },
    onSuccess: (job: MailJobItem) => {
      queryClient.invalidateQueries({ queryKey: ["time-off"] });
      setJobStatusLabel(null);
      setCredentialsJobId(null);
      if (job.status === "sent") {
        setOpen(false);
        setError(null);
        setDraftExpanded(false);
        toast.success(
          `Đã gửi mail xin nghỉ phép tới ${(job.sentTo ?? job.mail?.to ?? []).join(", ") || "HR"}${job.timeOffId ? ` (#${job.timeOffId})` : ""}`
        );
        setForm({
          startDate: todayIso(),
          endDate: todayIso(),
          session: "FULL",
          reason: "ANNUAL_LEAVE",
          reasonOther: "",
          details: "",
          businessTripSchedule: [],
          recipientIds: hrRecipientIds,
        });
      } else if (job.status === "failed") {
        const msg = job.error || "Gửi mail thất bại từ máy trạm";
        setError(msg);
        toast.error("Gửi mail thất bại", msg);
      } else if (job.status === "need_credentials") {
        const msg = "Hết thời gian chờ nhập credentials — vui lòng thử gửi lại";
        setError(msg);
        toast.error("Hết thời gian chờ", msg);
      } else {
        const msg = "Máy trạm chưa xử lý xong (có thể agent chưa chạy). Vui lòng kiểm tra rồi thử lại.";
        setError(msg);
        toast.error("Chưa hoàn tất", msg);
      }
    },
    onError: (err) => {
      setJobStatusLabel(null);
      setCredentialsJobId(null);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error("Lỗi gửi yêu cầu", msg);
    },
    onSettled: () => setIsSubmittingMailJob(false),
  });

  async function handleSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!credentialsJobId) return;
    setCredError(null);
    setIsSubmittingCreds(true);
    try {
      await submitMailJobCredentials(credentialsJobId, {
        email: credEmail.trim(),
        password: credPassword,
      });
      setJobStatusLabel("Đã gửi thông tin đăng nhập — máy trạm đang gửi mail...");
      setCredPassword("");
    } catch (err) {
      setCredError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmittingCreds(false);
    }
  }

  const cancelMutation = useMutation({
    mutationFn: cancelTimeOff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off"] });
      toast.success("Đã xóa đơn xin nghỉ phép!");
    },
    onError: (err) => {
      toast.error("Lỗi xóa đơn", err instanceof Error ? err.message : undefined);
    },
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      setTimeOffStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["time-off"] });
      if (vars.status === "approved") {
        toast.success("Đã duyệt đơn xin nghỉ phép!");
      } else {
        toast.info("Đã từ chối đơn xin nghỉ phép.");
      }
    },
    onError: (err) => {
      toast.error("Không thể cập nhật trạng thái đơn", err instanceof Error ? err.message : undefined);
    },
  });

  const baseList = useMemo(
    () => (canViewAll ? (allQuery.data ?? []) : (myQuery.data ?? [])),
    [canViewAll, allQuery.data, myQuery.data]
  );

  const displayList = useMemo(() => {
    let items = baseList;
    if (canViewAll) {
      if (activeTab === "pending") {
        items = items.filter((t) => t.status === "pending");
      } else if (activeTab === "mine") {
        items = items.filter((t) => t.userId === user?.id);
      }
      if (filterUserId && activeTab !== "mine") {
        items = items.filter((t) => t.userId === filterUserId);
      }
    } else {
      if (statusFilter) {
        items = items.filter((t) => t.status === statusFilter);
      }
    }
    return filterTimeOffByCreatedDate(items, appliedDateFrom, appliedDateTo);
  }, [baseList, canViewAll, activeTab, filterUserId, user?.id, statusFilter, appliedDateFrom, appliedDateTo]);

  const canManageDeletes = canViewAll;

  const deletableItems = useMemo(() => {
    if (!canManageDeletes) return [];
    return displayList;
  }, [displayList, canManageDeletes]);

  const listLoading = canViewAll ? allQuery.isLoading : myQuery.isLoading;

  function handleApplyDateFilter() {
    setFilterError(null);
    if (draftDateFrom && draftDateTo && draftDateTo < draftDateFrom) {
      setFilterError("Đến ngày phải lớn hơn hoặc bằng từ ngày");
      return;
    }
    setAppliedDateFrom(draftDateFrom);
    setAppliedDateTo(draftDateTo);
  }

  function handleClearDateFilter() {
    setDraftDateFrom("");
    setDraftDateTo("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setFilterUserId("");
    setFilterError(null);
  }

  async function executeConfirmedDelete() {
    if (!deleteConfirm) return;
    setFilterError(null);
    if (deleteConfirm.kind === "one") {
      try {
        await cancelMutation.mutateAsync(deleteConfirm.id);
        setDeleteConfirm(null);
      } catch (err) {
        setFilterError(err instanceof Error ? err.message : "Xóa thất bại");
      }
      return;
    }

    const ids = deletableItems.map((r) => r.id);
    if (ids.length === 0) {
      setDeleteConfirm(null);
      return;
    }
    setIsDeletingAll(true);
    try {
      for (const id of ids) {
        await cancelTimeOff(id);
      }
      await queryClient.invalidateQueries({ queryKey: ["time-off"] });
      toast.success(`Đã xóa tất cả ${ids.length} đơn xin nghỉ phép!`);
      setDeleteConfirm(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Xóa thất bại";
      setFilterError(msg);
      toast.error("Lỗi xóa đơn", msg);
    } finally {
      setIsDeletingAll(false);
    }
  }

  useEffect(() => {
    if (!open || hrRecipientIds.length === 0) return;
    setForm((f) =>
      f.recipientIds.length === 0 ? { ...f, recipientIds: hrRecipientIds } : f
    );
  }, [open, hrRecipientIds]);

  useEffect(() => {
    const saved = profileQuery.data?.timeOffExtraRecipients ?? [];
    setExtraRecipients(saved);
  }, [profileQuery.data?.timeOffExtraRecipients]);

  useEffect(() => {
    if (!open) {
      setExtraDefaultsReady(false);
      return;
    }
    if (extraDefaultsReady) return;
    const defaults = (profileQuery.data?.timeOffExtraRecipients ?? [])
      .filter((r) => r.isDefault)
      .map((r) => r.email);
    setSelectedExtraEmails(defaults);
    setExtraEmailInput("");
    setExtraEmailError(null);
    setExtraDefaultsReady(true);
  }, [open, extraDefaultsReady, profileQuery.data?.timeOffExtraRecipients]);

  const draftToEmails = useMemo(() => {
    const hrEmails = (recipientQuery.data ?? [])
      .filter((r) => form.recipientIds.includes(r.id))
      .map((r) => String(r.email ?? "").trim().toLowerCase())
      .filter((e) => EMAIL_RE.test(e));
    return [...new Set([...hrEmails, ...selectedExtraEmails])];
  }, [recipientQuery.data, form.recipientIds, selectedExtraEmails]);

  async function persistExtraRecipients(next: TimeOffExtraRecipient[]) {
    setExtraSaving(true);
    setExtraEmailError(null);
    try {
      const updated = await updateProfile({ timeOffExtraRecipients: next });
      const saved = updated.timeOffExtraRecipients ?? next;
      setExtraRecipients(saved);
      queryClient.setQueryData(["profile", user?.id], updated);
      return saved;
    } catch (err) {
      setExtraEmailError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setExtraSaving(false);
    }
  }

  async function handleAddExtraEmail(e?: React.FormEvent) {
    e?.preventDefault();
    const email = extraEmailInput.trim().toLowerCase();
    if (!email) {
      setExtraEmailError("Vui lòng nhập địa chỉ email");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setExtraEmailError("Email không đúng định dạng");
      return;
    }
    setExtraEmailError(null);
    const exists = extraRecipients.some((r) => r.email === email);
    if (exists) {
      setSelectedExtraEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
      setExtraEmailInput("");
      return;
    }
    const next = [...extraRecipients, { email, isDefault: false }];
    try {
      await persistExtraRecipients(next);
      setSelectedExtraEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
      setExtraEmailInput("");
    } catch {
      /* error already set */
    }
  }

  function toggleExtraSelected(email: string) {
    setSelectedExtraEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  }

  async function toggleExtraDefault(email: string) {
    const next = extraRecipients.map((r) =>
      r.email === email ? { ...r, isDefault: !r.isDefault } : r
    );
    try {
      const saved = await persistExtraRecipients(next);
      const row = saved.find((r) => r.email === email);
      if (row?.isDefault) {
        setSelectedExtraEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
      }
    } catch {
      /* error already set */
    }
  }

  async function removeExtraRecipient(email: string) {
    const next = extraRecipients.filter((r) => r.email !== email);
    try {
      await persistExtraRecipients(next);
      setSelectedExtraEmails((prev) => prev.filter((e) => e !== email));
    } catch {
      /* error already set */
    }
  }

  function toggleRecipient(id: string) {
    setForm((f) => {
      const has = f.recipientIds.includes(id);
      if (has) {
        if (f.recipientIds.length <= 1) return f;
        return { ...f, recipientIds: f.recipientIds.filter((x) => x !== id) };
      }
      return { ...f, recipientIds: [...f.recipientIds, id] };
    });
  }

  const regenerateDraft = useMemo(() => {
    return () => {
      const draft = buildMailDraftFromForm({
        userName: user?.fullName || user?.username || "",
        startDate: form.startDate,
        endDate: form.endDate,
        session: form.session,
        reason: form.reason,
        details: form.details,
        businessTripSchedule:
          form.reason === "BUSINESS_TRIP" ? form.businessTripSchedule : undefined,
        mailTemplate: mailTpl,
      });
      setDraftSubject(draft.subject);
      setDraftText(draft.text);
      setDraftDirty(false);
    };
  }, [
    user?.fullName,
    user?.username,
    form.startDate,
    form.endDate,
    form.session,
    form.reason,
    form.details,
    form.businessTripSchedule,
    mailTpl,
  ]);

  useEffect(() => {
    if (profileQuery.data?.mailTemplate) {
      setMailTpl(mergeMailTemplate(profileQuery.data.mailTemplate));
    }
  }, [profileQuery.data?.mailTemplate]);

  useEffect(() => {
    if (!open) return;
    if (draftDirty) return;
    regenerateDraft();
  }, [open, draftDirty, regenerateDraft]);

  function handleRegenerateFromTemplate(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    regenerateDraft();
  }

  function openTemplateModal(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setTplDraft({ ...mailTpl });
    setTplError(null);
    setTplModalOpen(true);
  }

  async function saveTemplateAndApply() {
    setTplSaving(true);
    setTplError(null);
    try {
      const next = mergeMailTemplate(tplDraft);
      const updated = await updateProfile({ mailTemplate: next });
      setMailTpl(mergeMailTemplate(updated.mailTemplate ?? next));
      queryClient.setQueryData(["profile", user?.id], updated);
      setTplModalOpen(false);
      const draft = buildMailDraftFromForm({
        userName: user?.fullName || user?.username || "",
        startDate: form.startDate,
        endDate: form.endDate,
        session: form.session,
        reason: form.reason,
        details: form.details,
        businessTripSchedule:
          form.reason === "BUSINESS_TRIP" ? form.businessTripSchedule : undefined,
        mailTemplate: next,
      });
      setDraftSubject(draft.subject);
      setDraftText(draft.text);
      setDraftDirty(false);
      toast.success("Đã lưu mẫu email!");
    } catch (err) {
      setTplError(err instanceof Error ? err.message : String(err));
    } finally {
      setTplSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsWakingApi(true);
    try {
      await wakeApi();
    } finally {
      setIsWakingApi(false);
    }
    if (!form.startDate || !form.endDate) {
      setError("Vui lòng chọn ngày bắt đầu và ngày kết thúc");
      return;
    }
    if (form.endDate < form.startDate) {
      setError("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
      return;
    }
    if (form.reason === "OTHER" && !form.reasonOther.trim()) {
      setError('Lý do "Khác" cần nhập nội dung chi tiết');
      return;
    }
    const recipientIds = form.recipientIds.length > 0 ? form.recipientIds : hrRecipientIds;
    if (recipientIds.length === 0) {
      setError("Chưa có tài khoản HR nào hoạt động để nhận yêu cầu");
      return;
    }
    if (form.reason === "BUSINESS_TRIP") {
      if (form.businessTripSchedule.length === 0) {
        setError("Công tác cần ít nhất 1 dòng lịch trình");
        return;
      }
      for (let i = 0; i < form.businessTripSchedule.length; i++) {
        const row = form.businessTripSchedule[i];
        const n = i + 1;
        if (!row.startDate || !row.endDate) {
          setError(`Lịch trình chặng ${n}: vui lòng chọn ngày bắt đầu và kết thúc`);
          return;
        }
        if (row.endDate < row.startDate) {
          setError(`Lịch trình chặng ${n}: ngày kết thúc phải >= ngày bắt đầu`);
          return;
        }
        if (!row.staff.trim()) {
          setError(`Lịch trình chặng ${n}: nhập nhân sự tham gia công tác`);
          return;
        }
        if (!row.location.trim()) {
          setError(`Lịch trình chặng ${n}: nhập địa điểm công tác`);
          return;
        }
        if (!row.description.trim()) {
          setError(`Lịch trình chặng ${n}: nhập nội dung công việc công tác`);
          return;
        }
      }
    }
    const schedulePayload =
      form.reason === "BUSINESS_TRIP"
        ? form.businessTripSchedule.map((row) => ({
            startDate: row.startDate,
            endDate: row.endDate,
            staff: row.staff.trim(),
            location: row.location.trim(),
            description: row.description.trim(),
          }))
        : undefined;
    if (!draftSubject.trim() || !draftText.trim()) {
      setError("Bản nháp email còn trống — vui lòng kiểm tra lại");
      return;
    }
    setIsSubmittingMailJob(true);
    createMutation.mutate({
      startDate: form.startDate,
      endDate: form.endDate,
      session: form.session,
      reason: form.reason,
      reasonOther: form.reason === "OTHER" ? form.reasonOther.trim() : undefined,
      details: form.reason === "BUSINESS_TRIP" ? undefined : form.details.trim() || undefined,
      businessTripSchedule: schedulePayload,
      recipientIds,
      additionalEmails: selectedExtraEmails,
      mailDraft: {
        subject: draftSubject.trim(),
        text: draftText.trim(),
        html: textToSimpleHtml(draftText.trim()),
      },
    });
  }

  function updateScheduleRow(index: number, patch: Partial<BusinessTripScheduleItem>) {
    setForm((f) => ({
      ...f,
      businessTripSchedule: f.businessTripSchedule.map((row, i) =>
        i === index ? { ...row, ...patch } : row
      ),
    }));
  }

  function addScheduleRow() {
    setForm((f) => ({
      ...f,
      businessTripSchedule: [...f.businessTripSchedule, emptyScheduleRow()],
    }));
  }

  function removeScheduleRow(index: number) {
    setForm((f) => ({
      ...f,
      businessTripSchedule: f.businessTripSchedule.filter((_, i) => i !== index),
    }));
  }

  function handleExportXlsx() {
    setFilterError(null);
    const from = appliedDateFrom || draftDateFrom;
    const to = appliedDateTo || draftDateTo;
    if (!from || !to) {
      setFilterError("Vui lòng chọn từ ngày và đến ngày trước khi tải Excel");
      return;
    }
    if (to < from) {
      setFilterError("Đến ngày phải lớn hơn hoặc bằng từ ngày");
      return;
    }
    const items = allQuery.data ?? [];
    const rows = expandTimeOffToExportRows(items, from, to);
    if (rows.length === 0) {
      setFilterError("Không có yêu cầu nào trong khoảng ngày đã chọn");
      return;
    }
    downloadTimeOffXlsx(rows, from, to);
  }

  function selectReason(reason: TimeOffReason) {
    setForm((f) => {
      const next = { ...f, reason };
      if (reason === "BUSINESS_TRIP" && f.businessTripSchedule.length === 0) {
        next.businessTripSchedule = [emptyScheduleRow()];
      }
      if (reason !== "BUSINESS_TRIP") {
        next.businessTripSchedule = [];
      }
      return next;
    });
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-24 md:pb-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <CalendarOff className="size-6 text-blue-600" /> Nghỉ phép & Công tác
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canViewAll
              ? "Quản lý và phê duyệt toàn bộ yêu cầu nghỉ phép, làm việc tại nhà (WFH) và công tác."
              : "Tạo và theo dõi các yêu cầu xin nghỉ phép, WFH hoặc đi công tác của bạn."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            className="h-10 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
            onClick={() =>
              setOpen((v) => {
                const next = !v;
                if (next) {
                  setDraftDirty(false);
                  setDraftExpanded(false);
                }
                return next;
              })
            }
          >
            {open ? (
              <>
                <X className="size-4 mr-1.5" /> Đóng biểu mẫu
              </>
            ) : (
              <>
                <Plus className="size-4 mr-1.5" /> Tạo yêu cầu mới
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Creation Form (Collapsible Card with Clean SaaS Styling) */}
      {open && (
        <section className="rounded-2xl border border-border bg-card shadow-md transition-all dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                <FileText className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Tạo đơn xin nghỉ phép / công tác</h2>
                <p className="text-xs text-muted-foreground">
                  Gửi thông báo qua máy trạm tới HR và đồng nghiệp liên quan
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* Block 1: Thời gian & Hình thức */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Thời gian & Hình thức nghỉ
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="startDate" className="text-xs font-medium text-foreground">
                    Từ ngày <span className="text-rose-500">*</span>
                  </Label>
                  <DatePicker
                    id="startDate"
                    value={form.startDate}
                    onChange={(val) => setForm((f) => ({ ...f, startDate: val }))}
                    placeholder="Chọn ngày bắt đầu"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="endDate" className="text-xs font-medium text-foreground">
                    Đến ngày <span className="text-rose-500">*</span>
                  </Label>
                  <DatePicker
                    id="endDate"
                    value={form.endDate}
                    min={form.startDate || undefined}
                    onChange={(val) => setForm((f) => ({ ...f, endDate: val }))}
                    placeholder="Chọn ngày kết thúc"
                  />
                </div>
              </div>

              {/* Buổi */}
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-foreground">Buổi áp dụng</Label>
                <div role="radiogroup" className="flex flex-wrap gap-2">
                  {SESSION_OPTIONS.map((opt) => {
                    const active = form.session === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setForm((f) => ({ ...f, session: opt.value }))}
                        className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-600 shadow-sm dark:bg-blue-950/60 dark:text-blue-300"
                            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground dark:border-slate-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lý do */}
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-foreground">Lý do nghỉ / Công tác</Label>
                <div role="radiogroup" className="flex flex-wrap gap-2">
                  {REASON_OPTIONS.map((opt) => {
                    const active = form.reason === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => selectReason(opt.value)}
                        className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-600 shadow-sm dark:bg-blue-950/60 dark:text-blue-300"
                            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground dark:border-slate-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.reason === "OTHER" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="reasonOther" className="text-xs font-medium text-foreground">
                    Mô tả lý do cụ thể <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="reasonOther"
                    value={form.reasonOther}
                    onChange={(e) => setForm((f) => ({ ...f, reasonOther: e.target.value }))}
                    placeholder="Nhập lý do cụ thể của bạn..."
                    rows={2}
                    className="shadow-sm"
                  />
                </div>
              )}

              {form.reason !== "BUSINESS_TRIP" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="timeoff-details" className="text-xs font-medium text-foreground">
                    Ghi chú thêm (tùy chọn)
                  </Label>
                  <Textarea
                    id="timeoff-details"
                    value={form.details}
                    onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                    placeholder="Bàn giao công việc hoặc các lưu ý khác..."
                    rows={2}
                    className="shadow-sm"
                  />
                </div>
              )}
            </div>

            {/* Block 2: Lịch trình công tác (Nếu chọn BUSINESS_TRIP) */}
            {form.reason === "BUSINESS_TRIP" && (
              <div className="space-y-3 rounded-xl border border-amber-200/90 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      2. Lịch trình công tác chi tiết
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Cần ít nhất 1 chặng lịch trình để bộ phận HR và kế toán theo dõi.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-amber-300 bg-card text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-slate-800"
                    onClick={addScheduleRow}
                  >
                    <Plus className="size-3.5 mr-1" /> Thêm chặng
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.businessTripSchedule.map((row, index) => (
                    <div key={index} className="rounded-lg border border-amber-200/80 bg-card p-3.5 shadow-sm space-y-3 dark:border-amber-900/40">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                          Chặng {index + 1}
                        </span>
                        {form.businessTripSchedule.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-rose-400 px-2"
                            onClick={() => removeScheduleRow(index)}
                          >
                            <Trash2 className="size-3.5 mr-1" /> Xóa chặng
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Từ ngày</Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={row.startDate}
                            onChange={(e) => updateScheduleRow(index, { startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Đến ngày</Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={row.endDate}
                            onChange={(e) => updateScheduleRow(index, { endDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Nhân sự đi cùng</Label>
                          <Input
                            className="h-8 text-xs"
                            value={row.staff}
                            onChange={(e) => updateScheduleRow(index, { staff: e.target.value })}
                            placeholder="Tên nhân sự tham gia..."
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Địa điểm</Label>
                          <Input
                            className="h-8 text-xs"
                            value={row.location}
                            onChange={(e) => updateScheduleRow(index, { location: e.target.value })}
                            placeholder="Tỉnh/Thành phố hoặc Khách hàng..."
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-[11px] text-muted-foreground">Nội dung công tác</Label>
                          <Textarea
                            rows={2}
                            className="text-xs"
                            value={row.description}
                            onChange={(e) =>
                              updateScheduleRow(index, { description: e.target.value })
                            }
                            placeholder="Mục đích và kết quả dự kiến..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block 3: Người nhận thông báo */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {form.reason === "BUSINESS_TRIP" ? "3." : "2."} Người nhận thông báo
              </h3>

              {/* HR Recipients */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground">
                    Bộ phận HR nhận đơn{" "}
                    <span className="font-normal text-muted-foreground">
                      ({form.recipientIds.length} đã chọn)
                    </span>
                  </Label>
                </div>
                {recipientQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">Đang tải danh sách HR...</p>
                ) : (recipientQuery.data ?? []).length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Chưa có tài khoản HR nào đang hoạt động.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(recipientQuery.data ?? []).map((recipient) => {
                      const selected = form.recipientIds.includes(recipient.id);
                      return (
                        <label
                          key={recipient.id}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                            selected
                              ? "border-blue-600 bg-blue-50 text-blue-900 font-semibold dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-500"
                              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground dark:border-slate-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="size-3.5 accent-blue-600"
                            checked={selected}
                            onChange={() => toggleRecipient(recipient.id)}
                          />
                          <span>{recipient.fullName}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Extra Recipients */}
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-foreground">
                  Đồng nghiệp khác nhận CC qua email{" "}
                  <span className="font-normal text-muted-foreground">
                    ({selectedExtraEmails.length} đã chọn)
                  </span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    className="h-9 flex-1 text-xs shadow-sm"
                    placeholder="dongnghiep@cybertech.com.vn"
                    value={extraEmailInput}
                    disabled={extraSaving}
                    onChange={(e) => {
                      setExtraEmailInput(e.target.value);
                      if (extraEmailError) setExtraEmailError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAddExtraEmail();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 shrink-0 px-3 text-xs"
                    disabled={extraSaving}
                    onClick={() => void handleAddExtraEmail()}
                  >
                    Thêm email
                  </Button>
                </div>
                {extraEmailError && (
                  <p className="text-[11px] text-rose-600" role="alert">
                    {extraEmailError}
                  </p>
                )}

                {extraRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {extraRecipients.map((row) => {
                      const selected = selectedExtraEmails.includes(row.email);
                      return (
                        <div
                          key={row.email}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
                            selected
                              ? "border-blue-300 bg-blue-50 text-blue-900 font-medium dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                              : "border-border bg-card text-muted-foreground dark:border-slate-800"
                          }`}
                        >
                          <button
                            type="button"
                            className="p-0.5 hover:text-amber-500"
                            title={row.isDefault ? "Bỏ mặc định" : "Đặt làm mặc định cho lần sau"}
                            disabled={extraSaving}
                            onClick={() => void toggleExtraDefault(row.email)}
                          >
                            <Star
                              className={`size-3 ${
                                row.isDefault
                                  ? "fill-amber-400 text-amber-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            className="max-w-[14rem] truncate px-1 text-left"
                            onClick={() => toggleExtraSelected(row.email)}
                          >
                            {row.email}
                          </button>
                          <button
                            type="button"
                            className="p-0.5 text-muted-foreground hover:text-rose-600"
                            title="Xóa email này"
                            disabled={extraSaving}
                            onClick={() => void removeExtraRecipient(row.email)}
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Block 4: Bản nháp email gửi từ máy trạm */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {form.reason === "BUSINESS_TRIP" ? "4." : "3."} Bản nháp email gửi đi
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Gửi tới: {draftToEmails.length > 0 ? draftToEmails.join(", ") : "— chưa có người nhận"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={openTemplateModal}
                  >
                    <Pencil className="size-3.5 mr-1" /> Mẫu mail
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={handleRegenerateFromTemplate}
                  >
                    <RefreshCw className="size-3.5 mr-1" /> Làm mới nháp
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setDraftExpanded((v) => !v)}
                  >
                    {draftExpanded ? "Thu gọn" : "Chỉnh sửa nội dung"}
                  </Button>
                </div>
              </div>

              {draftExpanded && (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="draft-subject" className="text-xs font-medium text-foreground">
                      Tiêu đề email
                    </Label>
                    <Input
                      id="draft-subject"
                      className="h-9 text-xs shadow-sm"
                      value={draftSubject}
                      onChange={(e) => {
                        setDraftDirty(true);
                        setDraftSubject(e.target.value);
                      }}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="draft-body" className="text-xs font-medium text-foreground">
                      Nội dung email
                    </Label>
                    <Textarea
                      id="draft-body"
                      rows={6}
                      className="font-mono text-xs leading-relaxed shadow-sm"
                      value={draftText}
                      onChange={(e) => {
                        setDraftDirty(true);
                        setDraftText(e.target.value);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {jobStatusLabel && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 flex items-center gap-2">
                <Clock4 className="size-4 animate-spin text-blue-600" />
                {jobStatusLabel}
              </div>
            )}

            {/* Form submit actions */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending || isWakingApi || isSubmittingMailJob}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                className="min-w-[10rem] bg-blue-600 text-white shadow hover:bg-blue-700"
                disabled={createMutation.isPending || isWakingApi || isSubmittingMailJob}
              >
                {isWakingApi ? (
                  "Đang kết nối API..."
                ) : createMutation.isPending || isSubmittingMailJob ? (
                  "Đang xử lý gửi..."
                ) : (
                  <>
                    <Send className="size-4 mr-1.5" /> Gửi đơn nghỉ phép
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Filter and Tab Section */}
      <section className="rounded-2xl border border-border bg-card shadow-sm dark:border-slate-800">
        {/* Navigation Tabs for HR/Admin */}
        {canViewAll ? (
          <div className="flex border-b border-border bg-muted/40 px-4 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "all"
                  ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600 dark:text-blue-400 dark:after:bg-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tất cả yêu cầu ({allQuery.data?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`relative px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "pending"
                  ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600 dark:text-blue-400 dark:after:bg-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chờ duyệt
              {pendingCount > 0 && (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("mine")}
              className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "mine"
                  ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-blue-600 dark:text-blue-400 dark:after:bg-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đơn của tôi ({myQuery.data?.length ?? 0})
            </button>
          </div>
        ) : (
          /* Status Pills Filter for Staff */
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground mr-1">Trạng thái:</span>
            {[
              { value: "", label: "Tất cả" },
              { value: "pending", label: "Chờ duyệt" },
              { value: "approved", label: "Đã duyệt" },
              { value: "rejected", label: "Từ chối" },
            ].map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setStatusFilter(st.value as TimeOffStatus | "")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  statusFilter === st.value
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground dark:border-slate-800"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}

        {/* Date and User Filter Inputs */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className={`grid flex-1 gap-3 sm:grid-cols-2 ${canViewAll && activeTab !== "mine" ? "lg:grid-cols-3 lg:max-w-2xl" : "lg:max-w-sm"}`}>
              <div className="grid gap-1">
                <Label htmlFor="filter-from" className="text-xs font-medium text-foreground">
                  Từ ngày tạo
                </Label>
                <DatePicker
                  id="filter-from"
                  className="h-9 text-xs"
                  value={draftDateFrom}
                  onChange={(val) => setDraftDateFrom(val)}
                  placeholder="Từ ngày..."
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="filter-to" className="text-xs font-medium text-foreground">
                  Đến ngày tạo
                </Label>
                <DatePicker
                  id="filter-to"
                  className="h-9 text-xs"
                  value={draftDateTo}
                  min={draftDateFrom || undefined}
                  onChange={(val) => setDraftDateTo(val)}
                  placeholder="Đến ngày..."
                />
              </div>
              {canViewAll && activeTab !== "mine" && (
                <div className="grid gap-1 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="filter-user" className="text-xs font-medium text-foreground">
                    Nhân viên
                  </Label>
                  <select
                    id="filter-user"
                    value={filterUserId}
                    onChange={(e) => setFilterUserId(e.target.value)}
                    disabled={usersQuery.isLoading}
                    className="border-input h-9 w-full min-w-0 rounded-md border bg-background text-foreground px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm dark:border-slate-800"
                  >
                    <option value="">Tất cả nhân viên</option>
                    {userFilterOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-9 bg-blue-600 text-white hover:bg-blue-700 px-3.5 text-xs shadow-sm"
                onClick={handleApplyDateFilter}
              >
                Áp dụng lọc
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 px-3 text-xs"
                onClick={handleClearDateFilter}
                disabled={
                  !draftDateFrom &&
                  !draftDateTo &&
                  !appliedDateFrom &&
                  !appliedDateTo &&
                  !filterUserId
                }
              >
                Xóa bộ lọc
              </Button>
              {canViewAll && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-xs"
                  onClick={handleExportXlsx}
                  disabled={allQuery.isLoading}
                >
                  <Download className="size-3.5 mr-1 text-muted-foreground" />
                  Xuất Excel
                </Button>
              )}
            </div>
          </div>

          {(appliedDateFrom || appliedDateTo || filterUserId) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="font-medium text-foreground">Đang lọc:</span>
              {(appliedDateFrom || appliedDateTo) && (
                <span>
                  {appliedDateFrom ? formatDateViDisplay(appliedDateFrom) : "bắt đầu"} → {appliedDateTo ? formatDateViDisplay(appliedDateTo) : "nay"}
                </span>
              )}
              {filterUserId && (
                <span>· Nhân viên: <strong className="text-foreground">{filterUserName}</strong></span>
              )}
            </p>
          )}
          {filterError && (
            <p className="text-xs text-rose-600 font-medium" role="alert">
              {filterError}
            </p>
          )}
        </div>
      </section>

      {/* Requests List Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-foreground">
            {canViewAll
              ? activeTab === "pending"
                ? "Danh sách đơn chờ duyệt"
                : activeTab === "mine"
                  ? "Đơn xin nghỉ phép của tôi"
                  : "Toàn bộ danh sách đơn"
              : "Danh sách đơn của bạn"}{" "}
            <span className="font-normal text-muted-foreground text-xs">
              ({displayList.length} đơn)
            </span>
          </h2>
          {canManageDeletes && deletableItems.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-rose-700 hover:bg-rose-50 text-xs"
              disabled={isDeletingAll || cancelMutation.isPending}
              onClick={() => setDeleteConfirm({ kind: "all" })}
            >
              <Trash2 className="size-3.5 mr-1" />
              {isDeletingAll ? "Đang xóa..." : `Xóa tất cả (${deletableItems.length})`}
            </Button>
          )}
        </div>

        {listLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 shadow-sm dark:border-slate-800">
            <Clock4 className="size-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm text-muted-foreground">Đang tải danh sách đơn...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-sm dark:border-slate-800">
            <div className="flex size-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-3">
              <CalendarOff className="size-7" />
            </div>
            <p className="text-base font-semibold text-foreground">Chưa có đơn xin nghỉ phép nào</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {appliedDateFrom || appliedDateTo || filterUserId
                ? "Không tìm thấy yêu cầu nào phù hợp với bộ lọc hiện tại. Thử xóa lọc để xem lại."
                : "Bấm vào nút Tạo yêu cầu mới để tạo đơn xin nghỉ phép hoặc công tác đầu tiên."}
            </p>
            {!open && (
              <Button
                size="sm"
                className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setOpen(true)}
              >
                <Plus className="size-4 mr-1.5" /> Tạo yêu cầu mới
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayList.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                showOwner={canViewAll && activeTab !== "mine"}
                canDelete={canManageDeletes}
                canDecide={canViewAll}
                onDelete={(id) => setDeleteConfirm({ kind: "one", id })}
                onDecide={(id, status) => decideMutation.mutate({ id, status })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Credentials Modal (Mail from workstation) */}
      {credentialsJobId &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" aria-hidden="true" />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cred-modal-title"
              className="relative z-[101] flex w-full max-w-[500px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl dark:border-slate-800"
            >
              <div className="space-y-1.5 border-b border-border px-6 py-4">
                <h2
                  id="cred-modal-title"
                  className="text-lg font-semibold tracking-tight text-foreground"
                >
                  Cấu hình tài khoản email gửi
                </h2>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Máy trạm cần tài khoản để gửi mail qua hệ thống webmail công ty. Thông tin chỉ được lưu tạm trên máy trạm của bạn.
                </p>
              </div>

              <form
                onSubmit={handleSubmitCredentials}
                className="flex flex-col gap-4 p-6"
              >
                {credError && (
                  <p className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                    {credError}
                  </p>
                )}

                <div className="flex w-full flex-col gap-1.5">
                  <Label htmlFor="credEmail" className="text-xs font-medium text-foreground">
                    Địa chỉ email
                  </Label>
                  <Input
                    id="credEmail"
                    type="email"
                    autoComplete="username"
                    className="w-full text-sm shadow-sm"
                    value={credEmail}
                    onChange={(e) => setCredEmail(e.target.value)}
                    required
                    placeholder="ban@cybertech.com.vn"
                  />
                </div>

                <div className="flex w-full flex-col gap-1.5">
                  <Label htmlFor="credPassword" className="text-xs font-medium text-foreground">
                    Mật khẩu webmail
                  </Label>
                  <div className="relative w-full">
                    <Input
                      id="credPassword"
                      type={showCredPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="w-full pr-11 text-sm shadow-sm"
                      value={credPassword}
                      onChange={(e) => setCredPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setShowCredPassword((v) => !v)}
                      aria-label={showCredPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showCredPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={isSubmittingCreds}
                    onClick={() => {
                      setCredentialsJobId(null);
                      setCredPassword("");
                      setShowCredPassword(false);
                      setCredError(null);
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 sm:min-w-[9rem]"
                    disabled={isSubmittingCreds}
                  >
                    {isSubmittingCreds ? "Đang gửi..." : "Lưu & Tiếp tục"}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Template Edit Modal */}
      {tplModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
              aria-label="Đóng"
              onClick={() => setTplModalOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tpl-modal-title"
              className="relative z-[111] flex max-h-[min(90vh,720px)] w-full max-w-[540px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl dark:border-slate-800"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0 space-y-0.5">
                  <h2 id="tpl-modal-title" className="text-base font-semibold text-foreground">
                    Cấu hình mẫu email xin nghỉ phép
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Biến thay thế:{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                      {"{{fullName}} {{department}} {{datePhrase}}"}
                    </code>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setTplModalOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                {tplError && (
                  <p className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                    {tplError}
                  </p>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="tpl-department" className="text-xs font-medium text-foreground">
                    Phòng ban ({"{{department}}"})
                  </Label>
                  <Input
                    id="tpl-department"
                    className="h-9 text-xs shadow-sm"
                    value={tplDraft.department}
                    onChange={(e) => setTplDraft((t) => ({ ...t, department: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="tpl-greeting" className="text-xs font-medium text-foreground">
                    Lời chào đầu thư
                  </Label>
                  <Input
                    id="tpl-greeting"
                    className="h-9 text-xs shadow-sm"
                    value={tplDraft.greeting}
                    onChange={(e) => setTplDraft((t) => ({ ...t, greeting: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="tpl-body" className="text-xs font-medium text-foreground">
                    Nội dung thư (nghỉ phép / WFH / đi trễ...)
                  </Label>
                  <Textarea
                    id="tpl-body"
                    rows={3}
                    className="font-mono text-xs leading-relaxed shadow-sm"
                    value={tplDraft.bodyTemplate}
                    onChange={(e) => setTplDraft((t) => ({ ...t, bodyTemplate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="tpl-biz-greeting" className="text-xs font-medium text-foreground">
                    Lời chào (khi đi công tác)
                  </Label>
                  <Input
                    id="tpl-biz-greeting"
                    className="h-9 text-xs shadow-sm"
                    value={tplDraft.businessGreeting}
                    onChange={(e) =>
                      setTplDraft((t) => ({ ...t, businessGreeting: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="tpl-biz-body" className="text-xs font-medium text-foreground">
                    Nội dung thư (khi đi công tác)
                  </Label>
                  <Textarea
                    id="tpl-biz-body"
                    rows={3}
                    className="font-mono text-xs leading-relaxed shadow-sm"
                    value={tplDraft.businessBodyTemplate}
                    onChange={(e) =>
                      setTplDraft((t) => ({ ...t, businessBodyTemplate: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="tpl-closing" className="text-xs font-medium text-foreground">
                    Chữ ký / Lời kết
                  </Label>
                  <Input
                    id="tpl-closing"
                    className="h-9 text-xs shadow-sm"
                    value={tplDraft.closing}
                    onChange={(e) => setTplDraft((t) => ({ ...t, closing: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTplDraft({ ...DEFAULT_MAIL_TEMPLATE })}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Khôi phục mặc định
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setTplModalOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={tplSaving}
                    onClick={() => void saveTemplateAndApply()}
                  >
                    {tplSaving ? "Đang lưu..." : "Lưu mẫu & Cập nhật"}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        title={deleteConfirm?.kind === "all" ? "Xóa tất cả đơn đã lọc?" : "Xóa đơn xin nghỉ phép?"}
        message={
          deleteConfirm?.kind === "all"
            ? `Bạn có chắc chắn muốn xóa toàn bộ ${deletableItems.length} đơn xin nghỉ phép đang hiển thị trong bộ lọc?`
            : "Bạn có chắc chắn muốn xóa đơn xin nghỉ phép này không? Thao tác này không thể hoàn tác."
        }
        confirmLabel="Xóa đơn"
        cancelLabel="Hủy"
        variant="danger"
        loading={cancelMutation.isPending || isDeletingAll}
        onCancel={() => {
          if (!cancelMutation.isPending && !isDeletingAll) setDeleteConfirm(null);
        }}
        onConfirm={() => void executeConfirmedDelete()}
      />
    </div>
  );
}
