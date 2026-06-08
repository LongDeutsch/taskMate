import * as XLSX from "xlsx";
import {
  formatTimeOffReason,
  type BusinessTripScheduleItem,
  type TimeOffRequest,
} from "@/shared/types";

export type TimeOffExportRow = {
  "Ngày bắt đầu": string;
  "Ngày kết thúc": string;
  "Họ tên": string;
  "Lý do off": string;
  "Nội dung chi tiết": string;
};

function normalizeIsoDate(value: string) {
  return String(value).slice(0, 10);
}

function formatDateVi(iso: string) {
  const raw = normalizeIsoDate(iso);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function overlapsRange(startDate: string, endDate: string, from: string, to: string) {
  const s = normalizeIsoDate(startDate);
  const e = normalizeIsoDate(endDate);
  return s <= to && e >= from;
}

function splitStaffNames(staff: string): string[] {
  return [...new Set(staff.split(/[,;]/).map((n) => n.trim()).filter(Boolean))];
}

function detailForRequest(req: TimeOffRequest): string {
  if (req.reason === "OTHER") {
    return [req.reasonOther, req.details].filter((p) => p?.trim()).join(" — ");
  }
  return req.details?.trim() ?? "";
}

function reasonLabel(req: TimeOffRequest): string {
  if (req.reason === "OTHER" && req.reasonOther?.trim()) {
    return `${formatTimeOffReason(req.reason)} — ${req.reasonOther.trim()}`;
  }
  return formatTimeOffReason(req.reason);
}

function scheduleDetail(item: BusinessTripScheduleItem): string {
  const parts: string[] = [];
  if (item.location?.trim()) parts.push(`Địa điểm: ${item.location.trim()}`);
  if (item.description?.trim()) parts.push(item.description.trim());
  return parts.join(". ");
}

function expandBusinessTripRows(
  req: TimeOffRequest,
  from: string,
  to: string
): TimeOffExportRow[] {
  const schedule = req.businessTripSchedule ?? [];
  const rows: TimeOffExportRow[] = [];

  for (const item of schedule) {
    if (!overlapsRange(item.startDate, item.endDate, from, to)) continue;

    const start = formatDateVi(item.startDate);
    const end = formatDateVi(item.endDate);
    const detail = scheduleDetail(item);
    const names = splitStaffNames(item.staff);
    const staffRows = names.length > 0 ? names : [req.userName];

    for (const name of staffRows) {
      rows.push({
        "Ngày bắt đầu": start,
        "Ngày kết thúc": end,
        "Họ tên": name,
        "Lý do off": "Công tác",
        "Nội dung chi tiết": detail,
      });
    }
  }

  return rows;
}

export function expandTimeOffToExportRows(
  requests: TimeOffRequest[],
  from: string,
  to: string
): TimeOffExportRow[] {
  const rows: TimeOffExportRow[] = [];

  for (const req of requests) {
    if (req.reason === "BUSINESS_TRIP") {
      const tripRows = expandBusinessTripRows(req, from, to);
      if (tripRows.length > 0) {
        rows.push(...tripRows);
        continue;
      }
      if (!overlapsRange(req.startDate, req.endDate, from, to)) continue;
    } else if (!overlapsRange(req.startDate, req.endDate, from, to)) {
      continue;
    }

    if (req.reason === "BUSINESS_TRIP") {
      rows.push({
        "Ngày bắt đầu": formatDateVi(req.startDate),
        "Ngày kết thúc": formatDateVi(req.endDate),
        "Họ tên": req.userName,
        "Lý do off": "Công tác",
        "Nội dung chi tiết": detailForRequest(req),
      });
      continue;
    }

    rows.push({
      "Ngày bắt đầu": formatDateVi(req.startDate),
      "Ngày kết thúc": formatDateVi(req.endDate),
      "Họ tên": req.userName,
      "Lý do off": reasonLabel(req),
      "Nội dung chi tiết": detailForRequest(req),
    });
  }

  return rows.sort((a, b) => {
    const [da, ma, ya] = a["Ngày bắt đầu"].split("/").map(Number);
    const [db, mb, yb] = b["Ngày bắt đầu"].split("/").map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });
}

export function downloadTimeOffXlsx(rows: TimeOffExportRow[], from: string, to: string) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
    { wch: 22 },
    { wch: 48 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Xin off");
  const fileName = `bao-cao-xin-off_${from}_${to}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
