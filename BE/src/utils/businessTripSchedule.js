import { createBadRequestError } from "./errors.js";
import { formatDateVi } from "./timeOffLabels.js";

export function normalizeIsoDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return raw.slice(0, 10);
}

function parseScheduleDate(value, field) {
  if (!value) throw createBadRequestError(`${field} là bắt buộc`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw createBadRequestError(`${field} không hợp lệ`);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

/** Chuẩn hoá & validate lịch trình công tác. */
export function normalizeBusinessTripSchedule(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw createBadRequestError("Công tác cần ít nhất 1 dòng lịch trình");
  }

  return raw.map((item, index) => {
    const row = index + 1;
    let start;
    let end;
    try {
      start = parseScheduleDate(item?.startDate, `Lịch trình dòng ${row}: ngày bắt đầu`);
      end = parseScheduleDate(item?.endDate, `Lịch trình dòng ${row}: ngày kết thúc`);
    } catch (err) {
      throw err;
    }
    if (end < start) {
      throw createBadRequestError(`Lịch trình dòng ${row}: ngày kết thúc phải >= ngày bắt đầu`);
    }

    const staff = String(item?.staff ?? "").trim();
    const location = String(item?.location ?? "").trim();
    const description = String(item?.description ?? "").trim();

    if (!staff) throw createBadRequestError(`Lịch trình dòng ${row}: nhân sự công tác là bắt buộc`);
    if (!location) throw createBadRequestError(`Lịch trình dòng ${row}: địa điểm công tác là bắt buộc`);
    if (!description) throw createBadRequestError(`Lịch trình dòng ${row}: nội dung công tác là bắt buộc`);

    return { startDate: start, endDate: end, staff, location, description };
  });
}

export function serializeBusinessTripSchedule(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    startDate: normalizeIsoDate(item.startDate),
    endDate: normalizeIsoDate(item.endDate),
    staff: item.staff ?? "",
    location: item.location ?? "",
    description: item.description ?? "",
  }));
}

export function scheduleOverallDateRange(items) {
  const dates = (items ?? []).flatMap((item) => [
    normalizeIsoDate(item.startDate),
    normalizeIsoDate(item.endDate),
  ]);
  if (dates.length === 0) return { start: null, end: null };
  dates.sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

export function formatScheduleLineText(item) {
  const start = formatDateVi(item.startDate);
  const end = formatDateVi(item.endDate);
  const startIso = normalizeIsoDate(item.startDate);
  const endIso = normalizeIsoDate(item.endDate);
  const datePart =
    startIso === endIso ? `Ngày ${start}` : `Từ ngày ${start} đến ngày ${end}`;
  return `* ${datePart}: ${item.staff} công tác tại ${item.location} để ${item.description}`;
}

export function formatScheduleLineHtml(item) {
  const text = formatScheduleLineText(item).replace(/^\* /, "");
  return `<li>${escapeHtml(text)}</li>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
