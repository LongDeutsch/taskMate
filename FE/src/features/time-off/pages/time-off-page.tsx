// File: src/features/time-off/pages/time-off-page.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarOff,
  Check,
  CheckCircle2,
  Clock4,
  Download,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  cancelTimeOff,
  createTimeOff,
  wakeApi,
  getAllTimeOffs,
  getMyTimeOffs,
  getTimeOffRecipients,
  getUsers,
  setTimeOffStatus,
} from "@/shared/api";
import {
  formatRoleLabel,
  formatTimeOffReason,
  formatTimeOffSession,
  getRoleLabel,
  type BusinessTripScheduleItem,
  type TimeOffReason,
  type TimeOffRecipient,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
        Lịch trình công tác
      </p>
      <ul className="space-y-2 text-sm">
        {items.map((row, idx) => (
          <li key={idx} className="rounded-md border border-amber-100 bg-background p-2">
            <p className="font-medium text-foreground">{formatScheduleDateRange(row.startDate, row.endDate)}</p>
            <p className="text-muted-foreground">
              <span className="text-foreground">{row.staff}</span>
              {row.location ? ` · tại ${row.location}` : ""}
            </p>
            {row.description ? (
              <p className="mt-1 text-foreground whitespace-pre-wrap">{row.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
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

function recipientLabel(r: TimeOffRecipient): string {
  return `${r.fullName} · ${formatRoleLabel(r.roleLabel ?? (r.role === "ADMIN" ? "ADMIN" : "STAFF"))}`;
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
    <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          {showOwner && (
            <div className="flex items-center gap-2">
              <span className="font-semibold">{req.userName}</span>
              {req.userRoleLabel && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {formatRoleLabel(req.userRoleLabel)}
                </span>
              )}
            </div>
          )}
          <div className="text-sm">
            <span className="font-medium">{req.startDate}</span>
            {req.startDate !== req.endDate && (
              <>
                <span className="mx-1 text-muted-foreground">→</span>
                <span className="font-medium">{req.endDate}</span>
              </>
            )}
            <span className="ml-2 text-muted-foreground">
              · Buổi: {formatTimeOffSession(req.session)}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Lý do: <span className="text-foreground">{formatTimeOffReason(req.reason)}</span>
            {req.reason === "OTHER" && req.reasonOther ? ` — ${req.reasonOther}` : ""}
          </div>
          {req.reason === "BUSINESS_TRIP" && req.businessTripSchedule?.length ? (
            <BusinessTripScheduleList items={req.businessTripSchedule} />
          ) : null}
          {req.details ? (
            <div className="text-sm text-muted-foreground">
              Chi tiết: <span className="text-foreground whitespace-pre-wrap">{req.details}</span>
            </div>
          ) : null}
          <div className="text-xs text-muted-foreground">
            Tạo lúc {new Date(req.createdAt).toLocaleString("vi-VN")}
          </div>
          {req.recipients && req.recipients.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>Người nhận:</span>
              {req.recipients.map((r) => (
                <span
                  key={r.id}
                  className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 ring-1 ring-indigo-100"
                >
                  {recipientLabel(r)}
                </span>
              ))}
            </div>
          )}
          {req.status !== "pending" && req.decidedByName && (
            <div className="text-xs text-muted-foreground">
              {req.status === "approved" ? "Duyệt bởi" : "Từ chối bởi"}{" "}
              <span className="text-foreground">{req.decidedByName}</span>
              {req.decidedAt && ` · ${new Date(req.decidedAt).toLocaleString("vi-VN")}`}
              {req.decisionNote && (
                <div className="mt-1 italic">"{req.decisionNote}"</div>
              )}
            </div>
          )}
        </div>
        <StatusBadge status={req.status} />
      </div>

      {(canDelete || canDecide) && (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDelete(req.id)}
              className="text-rose-700"
            >
              <Trash2 className="size-4" />
              Xóa
            </Button>
          )}
          {canDecide && req.status === "pending" && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => onDecide(req.id, "approved")}
              >
                <CheckCircle2 className="size-4" />
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
                onClick={() => onDecide(req.id, "rejected")}
              >
                <XCircle className="size-4" />
                Từ chối
              </Button>
            </>
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

  const recipientQuery = useQuery({
    queryKey: ["time-off", "recipients"],
    queryFn: getTimeOffRecipients,
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
    mutationFn: createTimeOff,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["time-off"] });
      setOpen(false);
      setError(null);
      setMailSuccess(null);
      if (result.mail?.queued) {
        setMailSuccess(
          `Yêu cầu đã tạo. Email đang gửi tới: ${(result.mail.recipients ?? []).join(", ")}. ` +
            (result.mail.note ??
              "Kiểm tra hộp thư đến người nhận sau 1–2 phút (có thể trong Spam).")
        );
      } else if (result.mail?.sent?.length) {
        const ids = result.mail.details
          ?.map((d) => d.messageId)
          .filter(Boolean)
          .join(", ");
        setMailSuccess(
          `SMTP đã chấp nhận gửi tới: ${result.mail.sent.join(", ")}.` +
            (ids ? ` Message-ID: ${ids}.` : "") +
            " Kiểm tra hộp thư đến người nhận (có thể trong Spam)."
        );
      } else if (result.mail?.error) {
        setMailSuccess(`Yêu cầu đã tạo. Gửi mail: ${result.mail.error}`);
      } else if (result.mail?.skipped) {
        setMailSuccess(
          result.mail.note ?? "Yêu cầu đã tạo. Người nhận chưa có email trong hồ sơ."
        );
      } else if (result.mail?.failed?.length) {
        setMailSuccess(`Không gửi được tới: ${result.mail.failed.join(", ")}`);
      }
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
    },
    onError: (err) => setError(err instanceof Error ? err.message : String(err)),
  });

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
    if (!open || hrRecipientIds.length === 0) return;
    setForm((f) => ({ ...f, recipientIds: hrRecipientIds }));
  }, [open, hrRecipientIds]);

  const selectedRecipientNames = useMemo(() => {
    const recipients = recipientQuery.data ?? [];
    const map = new Map(recipients.map((r) => [r.id, r]));
    return form.recipientIds
      .map((id) => map.get(id))
      .filter((r): r is TimeOffRecipient => Boolean(r))
      .map(recipientLabel);
  }, [form.recipientIds, recipientQuery.data]);

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
    const recipientIds = hrRecipientIds.length > 0 ? hrRecipientIds : form.recipientIds;
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
    createMutation.mutate({
      startDate: form.startDate,
      endDate: form.endDate,
      session: form.session,
      reason: form.reason,
      reasonOther: form.reason === "OTHER" ? form.reasonOther.trim() : undefined,
      details: form.reason === "BUSINESS_TRIP" ? undefined : form.details.trim() || undefined,
      businessTripSchedule: schedulePayload,
      recipientIds,
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
    <div className="w-full min-w-0 space-y-6 pb-28 md:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold sm:text-2xl">
            <CalendarOff className="size-6 text-primary" /> Xin off
          </h1>
          <p className="text-muted-foreground">
            {canViewAll
              ? "Quản lý yêu cầu xin off của bản thân và toàn bộ nhân viên."
              : "Gửi yêu cầu xin off của bạn tới HR."}
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" />
          {open ? "Đóng biểu mẫu" : "Tạo yêu cầu mới"}
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bộ lọc &amp; báo cáo
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div
              className={`grid flex-1 gap-3 sm:grid-cols-2 ${canViewAll ? "lg:grid-cols-3 lg:max-w-3xl" : "lg:max-w-md"}`}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="filter-from" className="text-sm">
                  Từ ngày
                </Label>
                <Input
                  id="filter-from"
                  type="date"
                  value={draftDateFrom}
                  onChange={(e) => setDraftDateFrom(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="filter-to" className="text-sm">
                  Đến ngày
                </Label>
                <Input
                  id="filter-to"
                  type="date"
                  value={draftDateTo}
                  onChange={(e) => setDraftDateTo(e.target.value)}
                />
              </div>
              {canViewAll && (
                <div className="grid gap-1.5 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="filter-user" className="text-sm">
                    Nhân viên
                  </Label>
                  <select
                    id="filter-user"
                    value={filterUserId}
                    onChange={(e) => setFilterUserId(e.target.value)}
                    disabled={usersQuery.isLoading}
                    className="border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
              <Button type="button" size="sm" onClick={handleApplyDateFilter}>
                Áp dụng
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
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
                  variant="outline"
                  onClick={handleExportXlsx}
                  disabled={allQuery.isLoading}
                >
                  <Download className="size-4" />
                  Tải Excel
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Lọc danh sách theo <span className="font-medium">ngày tạo</span> yêu cầu.
            {canViewAll
              ? " Excel xuất theo ngày bắt đầu/kết thúc off trong khoảng đã chọn."
              : ""}
            {(appliedDateFrom || appliedDateTo || filterUserId) && (
              <span className="ml-1 text-foreground">
                Đang lọc:
                {(appliedDateFrom || appliedDateTo) && (
                  <span>
                    {" "}
                    ngày tạo {appliedDateFrom || "…"} → {appliedDateTo || "…"}
                  </span>
                )}
                {filterUserId && (
                  <span>
                    {(appliedDateFrom || appliedDateTo) ? " ·" : ""} nhân viên:{" "}
                    {filterUserName ?? "…"}
                  </span>
                )}
              </span>
            )}
          </p>
          {filterError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {filterError}
            </p>
          )}
        </CardContent>
      </Card>

      {mailSuccess && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {mailSuccess}
        </p>
      )}

      {open && (
        <Card>
          <CardHeader>
            <CardTitle>Biểu mẫu xin off</CardTitle>
            <CardDescription>HR sẽ nhận thông báo ngay khi bạn gửi yêu cầu.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-700">{error}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Ngày bắt đầu</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">Ngày kết thúc</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>
                  Buổi nghỉ{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (đang chọn: {formatTimeOffSession(form.session)})
                  </span>
                </Label>
                <div role="radiogroup" aria-label="Buổi nghỉ" className="grid grid-cols-3 gap-2">
                  {SESSION_OPTIONS.map((opt) => {
                    const active = form.session === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setForm((f) => ({ ...f, session: opt.value }))}
                        className={`relative rounded-lg border p-2 text-sm font-semibold transition ${
                          active
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600"
                            : "border-slate-200 bg-background hover:bg-accent"
                        }`}
                      >
                        {active && (
                          <span className="absolute right-1.5 top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                            <Check className="size-2.5" />
                          </span>
                        )}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>
                  Lý do{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (đang chọn: {formatTimeOffReason(form.reason)})
                  </span>
                </Label>
                <div role="radiogroup" aria-label="Lý do" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {REASON_OPTIONS.map((opt) => {
                    const active = form.reason === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => selectReason(opt.value)}
                        className={`relative rounded-lg border p-2 text-sm font-semibold transition ${
                          active
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-600"
                            : "border-slate-200 bg-background hover:bg-accent"
                        }`}
                      >
                        {active && (
                          <span className="absolute right-1.5 top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                            <Check className="size-2.5" />
                          </span>
                        )}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.reason === "BUSINESS_TRIP" && (
                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-base font-semibold">Lịch trình công tác</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addScheduleRow}>
                      <Plus className="size-4" />
                      Thêm lịch trình
                    </Button>
                  </div>
                  {form.businessTripSchedule.length === 0 ? (
                    <p className="text-sm text-amber-800">Cần ít nhất 1 dòng lịch trình.</p>
                  ) : (
                    <div className="space-y-3">
                      {form.businessTripSchedule.map((row, index) => (
                        <div
                          key={index}
                          className="space-y-3 rounded-lg border border-border bg-background p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">Dòng {index + 1}</span>
                            {form.businessTripSchedule.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-rose-700"
                                onClick={() => removeScheduleRow(index)}
                              >
                                <Trash2 className="size-4" />
                                Xóa
                              </Button>
                            )}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor={`trip-start-${index}`}>Ngày bắt đầu</Label>
                              <Input
                                id={`trip-start-${index}`}
                                type="date"
                                value={row.startDate}
                                onChange={(e) =>
                                  updateScheduleRow(index, { startDate: e.target.value })
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor={`trip-end-${index}`}>Ngày kết thúc</Label>
                              <Input
                                id={`trip-end-${index}`}
                                type="date"
                                value={row.endDate}
                                onChange={(e) =>
                                  updateScheduleRow(index, { endDate: e.target.value })
                                }
                              />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                              <Label htmlFor={`trip-staff-${index}`}>Nhân sự công tác</Label>
                              <Input
                                id={`trip-staff-${index}`}
                                value={row.staff}
                                onChange={(e) => updateScheduleRow(index, { staff: e.target.value })}
                                placeholder="Ví dụ: Anh A, chị B"
                              />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                              <Label htmlFor={`trip-location-${index}`}>Địa điểm công tác</Label>
                              <Input
                                id={`trip-location-${index}`}
                                value={row.location}
                                onChange={(e) =>
                                  updateScheduleRow(index, { location: e.target.value })
                                }
                                placeholder="Ví dụ: Hà Nội, TP.HCM"
                              />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                              <Label htmlFor={`trip-desc-${index}`}>Nội dung công tác</Label>
                              <Textarea
                                id={`trip-desc-${index}`}
                                value={row.description}
                                onChange={(e) =>
                                  updateScheduleRow(index, { description: e.target.value })
                                }
                                placeholder="Mục đích, công việc cụ thể..."
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {form.reason !== "BUSINESS_TRIP" && (
                <div className="grid gap-2">
                  <Label htmlFor="timeoff-details">Thông tin thêm (tùy chọn)</Label>
                  <Textarea
                    id="timeoff-details"
                    value={form.details}
                    onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                    placeholder="Ghi chú cụ thể: lý do chi tiết, công việc bàn giao, liên hệ khẩn..."
                    rows={3}
                  />
                </div>
              )}

              {form.reason === "OTHER" && (
                <div className="grid gap-2">
                  <Label htmlFor="reasonOther">Mô tả lý do</Label>
                  <Textarea
                    id="reasonOther"
                    value={form.reasonOther}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reasonOther: e.target.value }))
                    }
                    placeholder="Nhập lý do cụ thể"
                    rows={3}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label>
                  Người nhận HR{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (tự động gửi tới tất cả HR)
                  </span>
                </Label>
                {recipientQuery.isLoading ? (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Đang tải danh sách HR...
                  </div>
                ) : (recipientQuery.data ?? []).length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-amber-700">
                    Chưa có tài khoản HR active. Tạo user HR (có email) trong mục Users.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(recipientQuery.data ?? []).map((recipient) => (
                      <div
                        key={recipient.id}
                        className="relative rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-left"
                      >
                        <span className="absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded-full bg-violet-600 text-white">
                          <Check className="size-3" />
                        </span>
                        <div className="pr-6 text-sm font-semibold">{recipient.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {recipient.username} · HR
                          {recipient.email ? ` · ${recipient.email}` : " · chưa có email"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Sẽ gửi thông báo & email tới:{" "}
                  {selectedRecipientNames.length > 0
                    ? selectedRecipientNames.join(", ")
                    : "chưa có HR"}
                </p>
              </div>

              <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
                Email tự động gửi tới địa chỉ email của người nhận đã chọn. Cấu hình webmail trong{" "}
                <a href="/profile" className="text-primary hover:underline">
                  Profile
                </a>{" "}
                để gửi SMTP.
              </p>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || isWakingApi}>
                  {isWakingApi ? "Đang kết nối server..." : "Gửi yêu cầu"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={createMutation.isPending || isWakingApi}
                >
                  Huỷ
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <CardTitle>Danh sách yêu cầu nghỉ phép</CardTitle>
              <CardDescription>
                {listLoading
                  ? "Đang tải..."
                  : displayList.length > 0
                    ? `${displayList.length} yêu cầu${
                        appliedDateFrom || appliedDateTo || filterUserId ? " (đã lọc)" : ""
                      }`
                    : baseList.length > 0
                      ? "Không có yêu cầu trong khoảng ngày đã chọn."
                      : canViewAll
                        ? "Chưa có yêu cầu nào."
                        : "Bạn chưa có yêu cầu nào."}
              </CardDescription>
            </div>
            {canManageDeletes && deletableItems.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 text-rose-700 hover:bg-rose-50"
                disabled={isDeletingAll || cancelMutation.isPending}
                onClick={() => setDeleteConfirm({ kind: "all" })}
              >
                <Trash2 className="size-4" />
                {isDeletingAll ? "Đang xóa..." : `Xóa tất cả (${deletableItems.length})`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {listLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Đang tải...</div>
          ) : displayList.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Không có yêu cầu phù hợp.
            </div>
          ) : (
            <div className="space-y-2">
              {displayList.map((req) => (
                <RequestRow
                  key={req.id}
                  req={req}
                  showOwner={canViewAll}
                  canDelete={canManageDeletes}
                  canDecide={canViewAll}
                  onDelete={(id) => setDeleteConfirm({ kind: "one", id })}
                  onDecide={(id, status) => decideMutation.mutate({ id, status })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
