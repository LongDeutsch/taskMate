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
  getAllTimeOffs,
  getMyTimeOffs,
  getTimeOffRecipients,
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

const SESSION_OPTIONS: { value: TimeOffSession; label: string }[] = [
  { value: "MORNING", label: "Sáng" },
  { value: "AFTERNOON", label: "Chiều" },
  { value: "FULL", label: "Cả ngày" },
];

const REASON_OPTIONS: { value: TimeOffReason; label: string }[] = [
  { value: "ANNUAL_LEAVE", label: "Nghỉ phép" },
  { value: "WFH", label: "Work from home" },
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
  canCancel,
  canDecide,
  onCancel,
  onDecide,
}: {
  req: TimeOffRequest;
  showOwner: boolean;
  canCancel: boolean;
  canDecide: boolean;
  onCancel: (id: string) => void;
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

      {(canCancel || canDecide) && (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {canCancel && req.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(req.id)}
              className="text-rose-700"
            >
              <Trash2 className="size-4" />
              Huỷ yêu cầu
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
  const [recipientsInitialized, setRecipientsInitialized] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | TimeOffStatus>("all");

  const [mailSuccess, setMailSuccess] = useState<string | null>(null);
  const [exportFrom, setExportFrom] = useState(todayIso());
  const [exportTo, setExportTo] = useState(todayIso());
  const [exportError, setExportError] = useState<string | null>(null);

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

  const createMutation = useMutation({
    mutationFn: createTimeOff,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["time-off"] });
      setOpen(false);
      setError(null);
      setMailSuccess(null);
      if (result.mail?.sent?.length) {
        const ids = result.mail.details
          ?.map((d) => d.messageId)
          .filter(Boolean)
          .join(", ");
        setMailSuccess(
          `SMTP đã chấp nhận gửi tới: ${result.mail.sent.join(", ")}.` +
            (ids ? ` Message-ID: ${ids}.` : "") +
            " Kiểm tra hộp thư đến người nhận (có thể trong Spam). Mail gửi qua TaskMate thường không hiện trong mục Đã gửi trên webmail."
        );
      } else if (result.mail?.error) {
        setMailSuccess(`Yêu cầu đã tạo nhưng gửi mail thất bại: ${result.mail.error}`);
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
        recipientIds: defaultRecipientIds,
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

  const filteredAll = useMemo(() => {
    const items = allQuery.data ?? [];
    if (filterStatus === "all") return items;
    return items.filter((t) => t.status === filterStatus);
  }, [allQuery.data, filterStatus]);

  const defaultRecipientIds = useMemo(
    () => (recipientQuery.data ?? []).filter((r) => r.isDefault).map((r) => r.id),
    [recipientQuery.data]
  );

  useEffect(() => {
    if (recipientsInitialized || defaultRecipientIds.length === 0) return;
    setForm((f) => ({ ...f, recipientIds: defaultRecipientIds }));
    setRecipientsInitialized(true);
  }, [defaultRecipientIds, recipientsInitialized]);

  const selectedRecipientNames = useMemo(() => {
    const recipients = recipientQuery.data ?? [];
    const map = new Map(recipients.map((r) => [r.id, r]));
    return form.recipientIds
      .map((id) => map.get(id))
      .filter((r): r is TimeOffRecipient => Boolean(r))
      .map(recipientLabel);
  }, [form.recipientIds, recipientQuery.data]);

  function toggleRecipient(id: string) {
    setForm((f) => ({
      ...f,
      recipientIds: f.recipientIds.includes(id)
        ? f.recipientIds.filter((v) => v !== id)
        : [...f.recipientIds, id],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    if (form.recipientIds.length === 0) {
      setError("Vui lòng chọn ít nhất một người nhận");
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
      recipientIds: form.recipientIds,
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
    setExportError(null);
    if (!exportFrom || !exportTo) {
      setExportError("Vui lòng chọn khoảng ngày báo cáo");
      return;
    }
    if (exportTo < exportFrom) {
      setExportError("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
      return;
    }
    const items = allQuery.data ?? [];
    const rows = expandTimeOffToExportRows(items, exportFrom, exportTo);
    if (rows.length === 0) {
      setExportError("Không có yêu cầu nào trong khoảng ngày đã chọn");
      return;
    }
    downloadTimeOffXlsx(rows, exportFrom, exportTo);
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
                  Người nhận{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (chọn nhiều, mặc định có HR)
                  </span>
                </Label>
                {recipientQuery.isLoading ? (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Đang tải người nhận...
                  </div>
                ) : (recipientQuery.data ?? []).length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-amber-700">
                    Chưa có HR/Admin/BODs active để nhận yêu cầu.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(recipientQuery.data ?? []).map((recipient) => {
                      const checked = form.recipientIds.includes(recipient.id);
                      const role = recipient.roleLabel ?? (recipient.role === "ADMIN" ? "ADMIN" : "STAFF");
                      return (
                        <button
                          key={recipient.id}
                          type="button"
                          onClick={() => toggleRecipient(recipient.id)}
                          className={`relative rounded-lg border p-3 text-left transition ${
                            checked
                              ? "border-violet-600 bg-violet-50 text-violet-800 ring-2 ring-violet-600"
                              : "border-slate-200 bg-background hover:bg-accent"
                          }`}
                          aria-pressed={checked}
                        >
                          {checked && (
                            <span className="absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded-full bg-violet-600 text-white">
                              <Check className="size-3" />
                            </span>
                          )}
                          <div className="pr-6 text-sm font-semibold">{recipient.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {recipient.username} · {formatRoleLabel(role)}
                            {recipient.isDefault ? " · mặc định HR" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Đang chọn:{" "}
                  {selectedRecipientNames.length > 0
                    ? selectedRecipientNames.join(", ")
                    : "chưa chọn người nhận"}
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
                <Button type="submit" disabled={createMutation.isPending}>
                  Gửi yêu cầu
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Huỷ
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Yêu cầu của tôi</CardTitle>
          <CardDescription>
            {myQuery.data?.length
              ? `${myQuery.data.length} yêu cầu`
              : "Bạn chưa có yêu cầu nào."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Đang tải...</div>
          ) : (myQuery.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Chưa có yêu cầu nào.</div>
          ) : (
            <div className="space-y-2">
              {(myQuery.data ?? []).map((req) => (
                <RequestRow
                  key={req.id}
                  req={req}
                  showOwner={false}
                  canCancel
                  canDecide={false}
                  onCancel={(id) => {
                    if (confirm("Huỷ yêu cầu này?")) cancelMutation.mutate(id);
                  }}
                  onDecide={() => {}}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canViewAll && (
        <Card>
          <CardHeader>
            <CardTitle>Tải báo cáo Excel</CardTitle>
            <CardDescription>
              Xuất file .xlsx theo khoảng ngày (lọc theo ngày bắt đầu/kết thúc yêu cầu). Công tác
              tách từng nhân sự trên mỗi dòng.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="export-from">Từ ngày</Label>
                <Input
                  id="export-from"
                  type="date"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="export-to">Đến ngày</Label>
                <Input
                  id="export-to"
                  type="date"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                />
              </div>
            </div>
            {exportError && (
              <p className="text-sm text-destructive" role="alert">
                {exportError}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleExportXlsx}
              disabled={allQuery.isLoading}
            >
              <Download className="size-4" />
              Tải xuống .xlsx
            </Button>
          </CardContent>
        </Card>
      )}

      {canViewAll && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Tất cả yêu cầu xin off</CardTitle>
              <CardDescription>
                {roleLabel === "HR"
                  ? "HR view: yêu cầu từ toàn bộ nhân viên."
                  : "Admin view: bao gồm cả yêu cầu của HR."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`rounded-full border px-3 py-1 capitalize transition ${
                    filterStatus === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {s === "all"
                    ? "Tất cả"
                    : s === "pending"
                      ? "Chờ duyệt"
                      : s === "approved"
                        ? "Đã duyệt"
                        : "Từ chối"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {allQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Đang tải...</div>
            ) : filteredAll.length === 0 ? (
              <div className="text-sm text-muted-foreground">Không có yêu cầu nào.</div>
            ) : (
              <div className="space-y-2">
                {filteredAll.map((req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    showOwner
                    canCancel={false}
                    canDecide
                    onCancel={() => {}}
                    onDecide={(id, status) => decideMutation.mutate({ id, status })}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
