// File: src/features/time-off/pages/time-off-page.tsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarOff,
  CheckCircle2,
  Clock4,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
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
  requestStationAccountUpdate,
  waitForStationAccountUpdate,
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

type DeleteConfirmState =
  | { kind: "one"; id: string }
  | { kind: "all" }
  | null;

const SESSION_OPTIONS: { value: TimeOffSession; label: string }[] = [
  { value: "MORNING", label: "Sáng" },
  { value: "AFTERNOON", label: "Chiều" },
  { value: "FULL", label: "Cả ngày" },
];

const REASON_OPTIONS: { value: TimeOffReason; label: string }[] = [
  { value: "ANNUAL_LEAVE", label: "Nghỉ phép" },
  { value: "WFH", label: "Work from home" },
  { value: "LATE_ARRIVAL", label: "Xin đi trễ" },
  { value: "EARLY_LEAVE", label: "Xin về sớm" },
  { value: "BUSINESS_TRIP", label: "Công tác" },
  { value: "OTHER", label: "Khác" },
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
  return `Từ ngày ${formatDateViDisplay(start)} đến ngày ${formatDateViDisplay(end)}`;
}

function BusinessTripScheduleList({ items }: { items: BusinessTripScheduleItem[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-1 space-y-1 rounded border border-amber-200/80 bg-amber-50/40 px-2 py-1.5 text-xs">
      {items.map((row, idx) => (
        <p key={idx} className="leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatScheduleDateRange(row.startDate, row.endDate)}
          </span>
          {" · "}
          {row.staff}
          {row.location ? ` · ${row.location}` : ""}
        </p>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: TimeOffStatus }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 className="size-3" /> Đã duyệt
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
        <XCircle className="size-3" /> Từ chối
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
      <Clock4 className="size-3" /> Chờ duyệt
    </span>
  );
}

function RequestRow({
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
    <div className="rounded-lg border border-border/80 bg-background px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          {showOwner && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="font-medium leading-tight">{req.userName}</span>
              {req.userRoleLabel && (
                <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-600">
                  {formatRoleLabel(req.userRoleLabel)}
                </span>
              )}
            </div>
          )}
          <p className="text-sm leading-snug">
            <span className="font-medium">{req.startDate}</span>
            {req.startDate !== req.endDate && (
              <>
                <span className="mx-1 text-muted-foreground">→</span>
                <span className="font-medium">{req.endDate}</span>
              </>
            )}
            <span className="text-muted-foreground">
              {" "}
              · {formatTimeOffSession(req.session)} · {formatTimeOffReason(req.reason)}
              {req.reason === "OTHER" && req.reasonOther ? ` — ${req.reasonOther}` : ""}
            </span>
          </p>
          {req.reason === "BUSINESS_TRIP" && req.businessTripSchedule?.length ? (
            <BusinessTripScheduleList items={req.businessTripSchedule} />
          ) : null}
          {req.details ? (
            <p className="line-clamp-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {req.details}
            </p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            {new Date(req.createdAt).toLocaleString("vi-VN")}
            {req.recipients && req.recipients.length > 0 && (
              <>
                {" · "}
                {req.recipients.map((r) => r.fullName).join(", ")}
              </>
            )}
            {req.status !== "pending" && req.decidedByName && (
              <>
                {" · "}
                {req.status === "approved" ? "Duyệt" : "Từ chối"}: {req.decidedByName}
              </>
            )}
          </p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      {(canDelete || (canDecide && req.status === "pending")) && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
          {canDecide && req.status === "pending" && (
            <>
              <Button
                size="sm"
                className="h-8 bg-emerald-600 px-2.5 text-white hover:bg-emerald-700"
                onClick={() => onDecide(req.id, "approved")}
              >
                <CheckCircle2 className="size-3.5" />
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-rose-700 hover:bg-rose-50"
                onClick={() => onDecide(req.id, "rejected")}
              >
                <XCircle className="size-3.5" />
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
              className="h-8 px-2.5 text-muted-foreground hover:text-rose-700"
            >
              <Trash2 className="size-3.5" />
              Xóa
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

  const [mailSuccess, setMailSuccess] = useState<string | null>(null);
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

  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [stationEmail, setStationEmail] = useState("");
  const [stationPassword, setStationPassword] = useState("");
  const [showStationPassword, setShowStationPassword] = useState(false);
  const [stationError, setStationError] = useState<string | null>(null);
  const [stationStatus, setStationStatus] = useState<string | null>(null);
  const [stationSaving, setStationSaving] = useState(false);

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
      mailDraft: { subject: string; text: string; html: string };
    }) => {
      const job = await createMailJob(payload);
      setJobStatusLabel("Đã tạo job — đang chờ máy trạm…");
      let current = await waitForMailJob(job.id, {
        onUpdate: (j) => {
          const map: Record<string, string> = {
            queued: "Đang chờ máy trạm nhận job…",
            claimed: "Máy trạm đã nhận — đang kiểm tra account…",
            need_credentials: "Máy trạm cần cấu hình email/mật khẩu…",
            sending: "Đang gửi mail từ máy trạm…",
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
              queued: "Đang chờ máy trạm…",
              claimed: "Máy trạm đã nhận…",
              need_credentials: j.error
                ? "Sai email/mật khẩu — vui lòng nhập lại"
                : "Vui lòng nhập email/mật khẩu webmail",
              sending: "Đang gửi mail từ máy trạm…",
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
        setMailSuccess(
          `Đã gửi mail tới ${(job.sentTo ?? job.mail?.to ?? []).join(", ") || "HR"}` +
            (job.timeOffId ? ` · #${job.timeOffId}` : "")
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
        setError(job.error || "Gửi mail thất bại từ máy trạm");
      } else if (job.status === "need_credentials") {
        setError("Hết thời gian chờ nhập credentials — thử gửi lại");
      } else {
        setError(
          "Máy trạm chưa xử lý xong (có thể agent chưa chạy). Kiểm tra máy trạm rồi thử lại."
        );
      }
    },
    onError: (err) => {
      setJobStatusLabel(null);
      setCredentialsJobId(null);
      setError(err instanceof Error ? err.message : String(err));
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
      setJobStatusLabel("Đã gửi credentials — máy trạm đang gửi mail…");
      setCredPassword("");
    } catch (err) {
      setCredError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmittingCreds(false);
    }
  }

  const cancelMutation = useMutation({
    mutationFn: cancelTimeOff,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-off"] }),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      setTimeOffStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-off"] }),
  });

  const baseList = useMemo(
    () => (canViewAll ? (allQuery.data ?? []) : (myQuery.data ?? [])),
    [canViewAll, allQuery.data, myQuery.data]
  );

  const displayList = useMemo(() => {
    let items = baseList;
    if (canViewAll && filterUserId) {
      items = items.filter((t) => t.userId === filterUserId);
    }
    return filterTimeOffByCreatedDate(items, appliedDateFrom, appliedDateTo);
  }, [baseList, canViewAll, filterUserId, appliedDateFrom, appliedDateTo]);

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
      setDeleteConfirm(null);
    } catch (err) {
      setFilterError(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setIsDeletingAll(false);
    }
  }

  useEffect(() => {
    if (!mailSuccess) return;
    const t = window.setTimeout(() => setMailSuccess(null), 4500);
    return () => window.clearTimeout(t);
  }, [mailSuccess]);

  useEffect(() => {
    if (!open || hrRecipientIds.length === 0) return;
    // Chỉ prefill tất cả HR lần đầu mở form (khi chưa chọn ai)
    setForm((f) =>
      f.recipientIds.length === 0 ? { ...f, recipientIds: hrRecipientIds } : f
    );
  }, [open, hrRecipientIds]);

  function toggleRecipient(id: string) {
    setForm((f) => {
      const has = f.recipientIds.includes(id);
      if (has) {
        // Giữ ít nhất 1 người nhận
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

  function openStationAccountModal() {
    setStationEmail(user?.email ?? profileQuery.data?.email ?? "");
    setStationPassword("");
    setShowStationPassword(false);
    setStationError(null);
    setStationStatus(null);
    setStationModalOpen(true);
  }

  async function handleSaveStationAccount(e: React.FormEvent) {
    e.preventDefault();
    setStationError(null);
    setStationSaving(true);
    setStationStatus("Đang gửi yêu cầu lên server…");
    try {
      await wakeApi();
      const item = await requestStationAccountUpdate({
        email: stationEmail.trim(),
        password: stationPassword,
      });
      setStationStatus("Chờ máy trạm xác thực SMTP…");
      const result = await waitForStationAccountUpdate(item.id, {
        onUpdate: (u) => {
          if (u.status === "pending") setStationStatus("Máy trạm đang kiểm tra đăng nhập…");
          if (u.status === "applied") setStationStatus("Đã ghi đè account trên máy trạm");
          if (u.status === "failed") setStationStatus("Cập nhật thất bại");
        },
      });
      if (result.status === "applied") {
        setStationModalOpen(false);
        setStationPassword("");
        setMailSuccess(`Đã cập nhật mail máy trạm: ${result.email}`);
      } else {
        setStationError(result.error || "Cập nhật thất bại trên máy trạm");
        setStationStatus(null);
      }
    } catch (err) {
      setStationError(err instanceof Error ? err.message : String(err));
      setStationStatus(null);
    } finally {
      setStationSaving(false);
    }
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
      // Force refresh draft from new template
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
      setError("Vui lòng chọn ngày bắt đầu và kết thúc");
      return;
    }
    if (form.endDate < form.startDate) {
      setError("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
      return;
    }
    if (form.reason === "OTHER" && !form.reasonOther.trim()) {
      setError('Lý do "Khác" cần nhập nội dung');
      return;
    }
    const recipientIds = form.recipientIds.length > 0 ? form.recipientIds : hrRecipientIds;
    if (recipientIds.length === 0) {
      setError("Chưa có tài khoản HR active để nhận yêu cầu xin off");
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
          setError(`Lịch trình dòng ${n}: vui lòng chọn ngày bắt đầu và kết thúc`);
          return;
        }
        if (row.endDate < row.startDate) {
          setError(`Lịch trình dòng ${n}: ngày kết thúc phải >= ngày bắt đầu`);
          return;
        }
        if (!row.staff.trim()) {
          setError(`Lịch trình dòng ${n}: nhập nhân sự công tác`);
          return;
        }
        if (!row.location.trim()) {
          setError(`Lịch trình dòng ${n}: nhập địa điểm công tác`);
          return;
        }
        if (!row.description.trim()) {
          setError(`Lịch trình dòng ${n}: nhập nội dung công tác`);
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
      setError("Bản nháp email còn trống — kiểm tra lại trước khi gửi");
      return;
    }
    setIsSubmittingMailJob(true);
    setMailSuccess(null);
    createMutation.mutate({
      startDate: form.startDate,
      endDate: form.endDate,
      session: form.session,
      reason: form.reason,
      reasonOther: form.reason === "OTHER" ? form.reasonOther.trim() : undefined,
      details: form.reason === "BUSINESS_TRIP" ? undefined : form.details.trim() || undefined,
      businessTripSchedule: schedulePayload,
      recipientIds,
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
      setFilterError("Chọn từ ngày và đến ngày trước khi tải Excel");
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
    <div className="w-full min-w-0 space-y-4 pb-24 md:pb-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
            <CalendarOff className="size-5 text-primary" /> Xin off
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {canViewAll ? "Quản lý yêu cầu xin off toàn công ty." : "Gửi yêu cầu xin off tới HR."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={openStationAccountModal}>
            <KeyRound className="size-3.5" />
            Cập nhật mail máy trạm
          </Button>
          <Button
            size="sm"
            className="shrink-0"
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
                <X className="size-4" /> Đóng form
              </>
            ) : (
              <>
                <Plus className="size-4" /> Tạo yêu cầu mới
              </>
            )}
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-border/80 bg-card px-3 py-2.5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Bộ lọc
        </p>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div
            className={`grid flex-1 gap-2 sm:grid-cols-2 ${canViewAll ? "lg:grid-cols-3 lg:max-w-2xl" : "lg:max-w-sm"}`}
          >
            <div className="grid gap-1">
              <Label htmlFor="filter-from" className="text-xs">
                Từ ngày
              </Label>
              <Input
                id="filter-from"
                type="date"
                className="h-8"
                value={draftDateFrom}
                onChange={(e) => setDraftDateFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="filter-to" className="text-xs">
                Đến ngày
              </Label>
              <Input
                id="filter-to"
                type="date"
                className="h-8"
                value={draftDateTo}
                onChange={(e) => setDraftDateTo(e.target.value)}
              />
            </div>
            {canViewAll && (
              <div className="grid gap-1 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="filter-user" className="text-xs">
                  Nhân viên
                </Label>
                <select
                  id="filter-user"
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  disabled={usersQuery.isLoading}
                  className="border-input h-8 w-full min-w-0 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                >
                  <option value="">Tất cả</option>
                  {userFilterOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" className="h-8" onClick={handleApplyDateFilter}>
              Áp dụng
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={handleClearDateFilter}
              disabled={
                !draftDateFrom &&
                !draftDateTo &&
                !appliedDateFrom &&
                !appliedDateTo &&
                !filterUserId
              }
            >
              Xóa lọc
            </Button>
            {canViewAll && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={handleExportXlsx}
                disabled={allQuery.isLoading}
              >
                <Download className="size-3.5" />
                Excel
              </Button>
            )}
          </div>
        </div>
        {(appliedDateFrom || appliedDateTo || filterUserId) && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Đang lọc
            {(appliedDateFrom || appliedDateTo) &&
              `: ${appliedDateFrom || "…"} → ${appliedDateTo || "…"}`}
            {filterUserId && ` · ${filterUserName ?? "…"}`}
          </p>
        )}
        {filterError && (
          <p className="mt-1.5 text-xs text-destructive" role="alert">
            {filterError}
          </p>
        )}
      </section>

      {open && (
        <section className="rounded-lg border border-border/80 bg-card">
          <div className="border-b border-border/60 px-3 py-2">
            <h2 className="text-sm font-semibold">Tạo yêu cầu</h2>
            <p className="text-[11px] text-muted-foreground">
              Mail qua máy trạm · yêu cầu tạo sau khi gửi thành công
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3 px-3 py-3">
            {error && (
              <p className="rounded-md bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{error}</p>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="startDate" className="text-xs">
                  Ngày bắt đầu
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  className="h-8"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="endDate" className="text-xs">
                  Ngày kết thúc
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  className="h-8"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-1">
              <Label className="text-xs">Buổi</Label>
              <div role="radiogroup" className="flex flex-wrap gap-1.5">
                {SESSION_OPTIONS.map((opt) => {
                  const active = form.session === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setForm((f) => ({ ...f, session: opt.value }))}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-1">
              <Label className="text-xs">Lý do</Label>
              <div role="radiogroup" className="flex flex-wrap gap-1.5">
                {REASON_OPTIONS.map((opt) => {
                  const active = form.reason === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => selectReason(opt.value)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {form.reason === "BUSINESS_TRIP" && (
              <div className="space-y-2 rounded-md border border-amber-200/80 bg-amber-50/30 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold">Lịch trình công tác</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7" onClick={addScheduleRow}>
                    <Plus className="size-3.5" /> Thêm
                  </Button>
                </div>
                {form.businessTripSchedule.length === 0 ? (
                  <p className="text-xs text-amber-800">Cần ít nhất 1 dòng.</p>
                ) : (
                  <div className="space-y-2">
                    {form.businessTripSchedule.map((row, index) => (
                      <div key={index} className="space-y-2 rounded-md border bg-background p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Dòng {index + 1}
                          </span>
                          {form.businessTripSchedule.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-rose-700"
                              onClick={() => removeScheduleRow(index)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            type="date"
                            className="h-8"
                            value={row.startDate}
                            onChange={(e) => updateScheduleRow(index, { startDate: e.target.value })}
                          />
                          <Input
                            type="date"
                            className="h-8"
                            value={row.endDate}
                            onChange={(e) => updateScheduleRow(index, { endDate: e.target.value })}
                          />
                          <Input
                            className="h-8 sm:col-span-2"
                            value={row.staff}
                            onChange={(e) => updateScheduleRow(index, { staff: e.target.value })}
                            placeholder="Nhân sự"
                          />
                          <Input
                            className="h-8 sm:col-span-2"
                            value={row.location}
                            onChange={(e) => updateScheduleRow(index, { location: e.target.value })}
                            placeholder="Địa điểm"
                          />
                          <Textarea
                            className="sm:col-span-2"
                            rows={2}
                            value={row.description}
                            onChange={(e) =>
                              updateScheduleRow(index, { description: e.target.value })
                            }
                            placeholder="Nội dung công tác"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.reason !== "BUSINESS_TRIP" && (
              <div className="grid gap-1">
                <Label htmlFor="timeoff-details" className="text-xs">
                  Thông tin thêm
                </Label>
                <Textarea
                  id="timeoff-details"
                  value={form.details}
                  onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                  placeholder="Ghi chú (tuỳ chọn)"
                  rows={2}
                />
              </div>
            )}

            {form.reason === "OTHER" && (
              <div className="grid gap-1">
                <Label htmlFor="reasonOther" className="text-xs">
                  Mô tả lý do
                </Label>
                <Textarea
                  id="reasonOther"
                  value={form.reasonOther}
                  onChange={(e) => setForm((f) => ({ ...f, reasonOther: e.target.value }))}
                  placeholder="Nhập lý do cụ thể"
                  rows={2}
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label className="text-xs">
                Người nhận HR{" "}
                <span className="font-normal text-muted-foreground">
                  ({form.recipientIds.length} đã chọn)
                </span>
              </Label>
              {recipientQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Đang tải HR…</p>
              ) : (recipientQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-amber-700">Chưa có HR active.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(recipientQuery.data ?? []).map((recipient) => {
                    const selected = form.recipientIds.includes(recipient.id);
                    return (
                      <label
                        key={recipient.id}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                          selected
                            ? "border-violet-500 bg-violet-50 text-violet-900"
                            : "border-border bg-background text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="size-3.5 accent-violet-600"
                          checked={selected}
                          onChange={() => toggleRecipient(recipient.id)}
                        />
                        <span className="font-medium">{recipient.fullName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-md border border-sky-200/80 bg-sky-50/30">
              <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setDraftExpanded((v) => !v)}
                >
                  <p className="text-xs font-semibold text-sky-950">Bản nháp email</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {draftSubject || "Chưa có tiêu đề"}
                    {draftDirty ? " · đã sửa" : ""}
                  </p>
                </button>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={openTemplateModal}
                  >
                    <Pencil className="size-3.5" />
                    Mẫu
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleRegenerateFromTemplate}
                  >
                    <RefreshCw className="size-3.5" />
                    Tạo lại
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setDraftExpanded((v) => !v)}
                  >
                    {draftExpanded ? "Thu gọn" : "Sửa"}
                  </Button>
                </div>
              </div>
              {draftExpanded && (
                <div className="space-y-2 border-t border-sky-100 px-2.5 py-2">
                  <div className="grid gap-1">
                    <Label htmlFor="draft-subject" className="text-xs">
                      Tiêu đề
                    </Label>
                    <Input
                      id="draft-subject"
                      className="h-8"
                      value={draftSubject}
                      onChange={(e) => {
                        setDraftDirty(true);
                        setDraftSubject(e.target.value);
                      }}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="draft-body" className="text-xs">
                      Nội dung
                    </Label>
                    <Textarea
                      id="draft-body"
                      rows={5}
                      className="font-mono text-xs leading-relaxed"
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
              <p className="rounded-md border border-sky-100 bg-sky-50/80 px-2.5 py-1.5 text-xs text-sky-900">
                {jobStatusLabel}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="submit"
                className="min-w-[9rem]"
                disabled={createMutation.isPending || isWakingApi || isSubmittingMailJob}
              >
                {isWakingApi
                  ? "Đang kết nối…"
                  : createMutation.isPending || isSubmittingMailJob
                    ? "Đang gửi…"
                    : "Gửi yêu cầu"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending || isWakingApi || isSubmittingMailJob}
              >
                Huỷ
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-lg border border-border/80 bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Danh sách yêu cầu</h2>
            <p className="text-[11px] text-muted-foreground">
              {listLoading
                ? "Đang tải…"
                : displayList.length > 0
                  ? `${displayList.length} yêu cầu`
                  : baseList.length > 0
                    ? "Không có yêu cầu trong bộ lọc."
                    : canViewAll
                      ? "Chưa có yêu cầu."
                      : "Bạn chưa có yêu cầu."}
            </p>
          </div>
          {canManageDeletes && deletableItems.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 shrink-0 text-rose-700 hover:bg-rose-50"
              disabled={isDeletingAll || cancelMutation.isPending}
              onClick={() => setDeleteConfirm({ kind: "all" })}
            >
              <Trash2 className="size-3.5" />
              {isDeletingAll ? "Đang xóa…" : `Xóa tất cả (${deletableItems.length})`}
            </Button>
          )}
        </div>
        <div className="space-y-2 p-2.5">
          {listLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Đang tải…</p>
          ) : displayList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Không có yêu cầu.</p>
          ) : (
            displayList.map((req) => (
              <RequestRow
                key={req.id}
                req={req}
                showOwner={canViewAll}
                canDelete={canManageDeletes}
                canDecide={canViewAll}
                onDelete={(id) => setDeleteConfirm({ kind: "one", id })}
                onDecide={(id, status) => decideMutation.mutate({ id, status })}
              />
            ))
          )}
        </div>
      </section>

      {mailSuccess &&
        createPortal(
          <div
            role="status"
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[120] mx-auto max-w-md md:bottom-4 md:left-auto md:right-4"
          >
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-emerald-900 shadow-lg ring-1 ring-emerald-100">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <p className="min-w-0 flex-1 text-xs sm:text-sm">{mailSuccess}</p>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => setMailSuccess(null)}
                aria-label="Đóng"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>,
          document.body
        )}

      {credentialsJobId &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
          >
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cred-modal-title"
              className="relative z-[101] flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            >
              <div className="space-y-2 border-b border-gray-100 px-5 py-4 sm:px-6">
                <h2
                  id="cred-modal-title"
                  className="text-lg font-semibold tracking-tight text-gray-900"
                >
                  Cấu hình email lần đầu
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Máy trạm chưa có account gửi mail của bạn. Nhập email và mật khẩu webmail
                  (mail.cybertech.com.vn). Thông tin chỉ lưu trên máy trạm.
                </p>
              </div>

              <form
                onSubmit={handleSubmitCredentials}
                className="flex flex-col gap-5 px-5 py-5 sm:px-6"
              >
                {credError && (
                  <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {credError}
                  </p>
                )}

                <div className="flex w-full flex-col gap-1.5">
                  <Label htmlFor="credEmail" className="text-sm font-medium text-gray-800">
                    Email gửi
                  </Label>
                  <Input
                    id="credEmail"
                    type="email"
                    autoComplete="username"
                    className="w-full"
                    value={credEmail}
                    onChange={(e) => setCredEmail(e.target.value)}
                    required
                    placeholder="ban@cybertech.com.vn"
                  />
                </div>

                <div className="flex w-full flex-col gap-1.5">
                  <Label htmlFor="credPassword" className="text-sm font-medium text-gray-800">
                    Mật khẩu webmail
                  </Label>
                  <div className="relative w-full">
                    <Input
                      id="credPassword"
                      type={showCredPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="w-full pr-11"
                      value={credPassword}
                      onChange={(e) => setCredPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-gray-800"
                      onClick={() => setShowCredPassword((v) => !v)}
                      aria-label={showCredPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showCredPassword ? (
                        <EyeOff className="size-[18px]" />
                      ) : (
                        <Eye className="size-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
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
                    className="w-full sm:w-auto sm:min-w-[10rem]"
                    disabled={isSubmittingCreds}
                  >
                    {isSubmittingCreds ? "Đang gửi…" : "Lưu & tiếp tục"}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {tplModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Đóng"
              onClick={() => setTplModalOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tpl-modal-title"
              className="relative z-[111] flex max-h-[min(90vh,720px)] w-full max-w-[520px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
                <div className="min-w-0 space-y-0.5">
                  <h2 id="tpl-modal-title" className="text-base font-semibold text-gray-900">
                    Chỉnh mẫu email
                  </h2>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Placeholder:{" "}
                    <code className="text-[10px]">
                      {"{{fullName}} {{department}} {{actionPhrase}} {{detailsClause}} {{datePhrase}} {{scheduleBlock}}"}
                    </code>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setTplModalOpen(false)}
                >
                  <X className="size-5" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
                {tplError && (
                  <p className="rounded-md bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{tplError}</p>
                )}
                <div className="grid gap-1">
                  <Label htmlFor="tpl-department" className="text-xs">
                    Phòng ban ({"{{department}}"})
                  </Label>
                  <Input
                    id="tpl-department"
                    className="h-8"
                    value={tplDraft.department}
                    onChange={(e) => setTplDraft((t) => ({ ...t, department: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="tpl-greeting" className="text-xs">
                    Lời chào
                  </Label>
                  <Input
                    id="tpl-greeting"
                    className="h-8"
                    value={tplDraft.greeting}
                    onChange={(e) => setTplDraft((t) => ({ ...t, greeting: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="tpl-body" className="text-xs">
                    Thân mail (nghỉ / WFH / đi trễ…)
                  </Label>
                  <Textarea
                    id="tpl-body"
                    rows={3}
                    className="font-mono text-xs"
                    value={tplDraft.bodyTemplate}
                    onChange={(e) => setTplDraft((t) => ({ ...t, bodyTemplate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="tpl-biz-greeting" className="text-xs">
                    Lời chào (công tác)
                  </Label>
                  <Input
                    id="tpl-biz-greeting"
                    className="h-8"
                    value={tplDraft.businessGreeting}
                    onChange={(e) =>
                      setTplDraft((t) => ({ ...t, businessGreeting: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="tpl-biz-body" className="text-xs">
                    Thân mail (công tác)
                  </Label>
                  <Textarea
                    id="tpl-biz-body"
                    rows={3}
                    className="font-mono text-xs"
                    value={tplDraft.businessBodyTemplate}
                    onChange={(e) =>
                      setTplDraft((t) => ({ ...t, businessBodyTemplate: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="tpl-closing" className="text-xs">
                    Chữ ký / kết
                  </Label>
                  <Input
                    id="tpl-closing"
                    className="h-8"
                    value={tplDraft.closing}
                    onChange={(e) => setTplDraft((t) => ({ ...t, closing: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTplDraft({ ...DEFAULT_MAIL_TEMPLATE })}
                >
                  Khôi phục mặc định
                </Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setTplModalOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="button" size="sm" disabled={tplSaving} onClick={() => void saveTemplateAndApply()}>
                    {tplSaving ? "Đang lưu…" : "Lưu mẫu & cập nhật nháp"}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {stationModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[115] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Đóng"
              onClick={() => !stationSaving && setStationModalOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="station-modal-title"
              className="relative z-[116] flex w-full max-w-[480px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
            >
              <div className="space-y-1 border-b border-gray-100 px-4 py-3">
                <h2 id="station-modal-title" className="text-base font-semibold text-gray-900">
                  Cập nhật mail máy trạm
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ghi đè email/mật khẩu SMTP trên máy trạm (
                  <code className="text-[10px]">accounts.json</code>). Máy trạm sẽ xác thực SMTP
                  trước khi lưu.
                </p>
              </div>
              <form onSubmit={handleSaveStationAccount} className="space-y-3 px-4 py-3">
                {stationError && (
                  <p className="rounded-md bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
                    {stationError}
                  </p>
                )}
                {stationStatus && !stationError && (
                  <p className="rounded-md border border-sky-100 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900">
                    {stationStatus}
                  </p>
                )}
                <div className="grid gap-1">
                  <Label htmlFor="station-email" className="text-xs">
                    Email gửi
                  </Label>
                  <Input
                    id="station-email"
                    type="email"
                    className="h-8"
                    required
                    value={stationEmail}
                    onChange={(e) => setStationEmail(e.target.value)}
                    disabled={stationSaving}
                    placeholder="ban@cybertech.com.vn"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="station-password" className="text-xs">
                    Mật khẩu webmail
                  </Label>
                  <div className="relative">
                    <Input
                      id="station-password"
                      type={showStationPassword ? "text" : "password"}
                      className="h-8 pr-10"
                      required
                      value={stationPassword}
                      onChange={(e) => setStationPassword(e.target.value)}
                      disabled={stationSaving}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowStationPassword((v) => !v)}
                      aria-label={showStationPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showStationPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={stationSaving}
                    onClick={() => setStationModalOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" size="sm" disabled={stationSaving}>
                    {stationSaving ? "Đang cập nhật…" : "Lưu & ghi đè máy trạm"}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        message="Bạn có chắc không?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        loading={cancelMutation.isPending || isDeletingAll}
        onCancel={() => {
          if (!cancelMutation.isPending && !isDeletingAll) setDeleteConfirm(null);
        }}
        onConfirm={() => void executeConfirmedDelete()}
      />
    </div>
  );
}
