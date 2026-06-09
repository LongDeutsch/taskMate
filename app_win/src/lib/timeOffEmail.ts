import type { BusinessTripScheduleItem, TimeOffReason, TimeOffSession } from "../types";

export interface EmailRequestShape {
  userName: string;
  startDate: string;
  endDate: string;
  session: TimeOffSession;
  reason: TimeOffReason;
  reasonOther?: string;
  details?: string;
  businessTripSchedule?: BusinessTripScheduleItem[];
}

const REASON_EMAIL_PHRASES: Record<string, string> = {
  ANNUAL_LEAVE: "xin nghỉ phép",
  WFH: "xin làm việc từ xa",
  BUSINESS_TRIP: "thông báo lịch công tác",
  OTHER: "gửi yêu cầu nghỉ/điều chỉnh lịch làm việc",
};

const REASON_EMAIL_SUBJECTS: Record<string, string> = {
  ANNUAL_LEAVE: "Đơn xin nghỉ phép",
  WFH: "Đề xuất làm việc từ xa",
  BUSINESS_TRIP: "Thông báo lịch công tác",
  OTHER: "Yêu cầu điều chỉnh lịch làm việc",
};

const SESSION_EMAIL_PHRASES: Record<string, string> = {
  MORNING: "trong buổi sáng",
  AFTERNOON: "trong buổi chiều",
  FULL: "cả ngày",
};

function normalizeIsoDate(value: string): string {
  return String(value).slice(0, 10);
}

export function formatDateVi(isoDate: string): string {
  const raw = normalizeIsoDate(isoDate);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scheduleOverallDateRange(items: BusinessTripScheduleItem[]) {
  const dates = items.flatMap((item) => [
    normalizeIsoDate(item.startDate),
    normalizeIsoDate(item.endDate),
  ]);
  if (!dates.length) return { start: null as string | null, end: null as string | null };
  dates.sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

function formatScheduleLineText(item: BusinessTripScheduleItem): string {
  const start = formatDateVi(item.startDate);
  const end = formatDateVi(item.endDate);
  const same = normalizeIsoDate(item.startDate) === normalizeIsoDate(item.endDate);
  const datePart = same ? `Ngày ${start}` : `Từ ngày ${start} đến ngày ${end}`;
  return `* ${datePart}: ${item.staff} công tác tại ${item.location} để ${item.description}`;
}

function formatScheduleLineHtml(item: BusinessTripScheduleItem): string {
  return `<li>${escapeHtml(formatScheduleLineText(item).replace(/^\* /, ""))}</li>`;
}

function formatTimeOffDateEmailPhrase(startDate: string, endDate: string): string {
  const startVi = formatDateVi(startDate);
  if (normalizeIsoDate(startDate) === normalizeIsoDate(endDate)) return `trong ngày ${startVi}`;
  return `từ ngày ${startVi} đến ngày ${formatDateVi(endDate)}`;
}

function formatEmailDateRangePhrase(startDate: string, endDate: string): string {
  const startVi = formatDateVi(startDate);
  if (normalizeIsoDate(startDate) === normalizeIsoDate(endDate)) return `ngày ${startVi}`;
  return `từ ngày ${startVi} đến ngày ${formatDateVi(endDate)}`;
}

function getEmailSubject(request: EmailRequestShape): string {
  const name = request.userName.trim() || "Nhân viên";
  let prefix =
    request.reason === "BUSINESS_TRIP"
      ? "Cập nhật lịch công tác"
      : REASON_EMAIL_SUBJECTS[request.reason] ?? "Yêu cầu liên quan lịch làm việc";

  let start = normalizeIsoDate(request.startDate);
  let end = normalizeIsoDate(request.endDate);
  if (request.reason === "BUSINESS_TRIP" && request.businessTripSchedule?.length) {
    const range = scheduleOverallDateRange(request.businessTripSchedule);
    if (range.start) start = range.start;
    if (range.end) end = range.end;
  }
  const startVi = formatDateVi(start);
  if (start === end) return `${prefix} - ${name} - ${startVi}`;
  return `${prefix} - ${name} - ${startVi} đến ngày ${formatDateVi(end)}`;
}

function buildBusinessTripEmail(request: EmailRequestShape, fullName: string) {
  const schedule = request.businessTripSchedule ?? [];
  const range = scheduleOverallDateRange(schedule);
  const start = range.start ?? normalizeIsoDate(request.startDate);
  const end = range.end ?? normalizeIsoDate(request.endDate);
  const datePhrase = formatEmailDateRangePhrase(start, end);
  const lines = schedule.map(formatScheduleLineText);

  const text = [
    "Dear anh/chị,",
    "",
    `Em là ${fullName} thuộc phòng RnD. Dưới sự chỉ đạo của ban lãnh đạo, em xin cập nhật lịch công tác ${datePhrase} như sau:`,
    "",
    ...lines,
    "",
    "Thân,",
    fullName,
  ].join("\n");

  const html = [
    "<p>Dear anh/chị,</p>",
    `<p>Em là <strong>${escapeHtml(fullName)}</strong> thuộc phòng RnD. Dưới sự chỉ đạo của ban lãnh đạo, em xin cập nhật lịch công tác ${escapeHtml(datePhrase)} như sau:</p>`,
    `<ul>${schedule.map(formatScheduleLineHtml).join("")}</ul>`,
    `<p>Thân,<br>${escapeHtml(fullName)}</p>`,
  ].join("\n");

  return { text, html, subject: getEmailSubject(request) };
}

export function buildTimeOffEmailContent(request: EmailRequestShape) {
  const fullName = request.userName.trim() || "Nhân viên";
  if (request.reason === "BUSINESS_TRIP") {
    return buildBusinessTripEmail(request, fullName);
  }

  const reasonPhrase = REASON_EMAIL_PHRASES[request.reason] ?? "xin hỗ trợ về lịch làm việc";
  const datePhrase = formatTimeOffDateEmailPhrase(request.startDate, request.endDate);
  const sessionPhrase = SESSION_EMAIL_PHRASES[request.session] ?? "cả ngày";
  const extraDetails = String(request.details ?? "").trim().replace(/[.。\s]+$/u, "");

  const mainSentence = extraDetails
    ? `Em là ${fullName} thuộc phòng RnD, em gửi mail để ${reasonPhrase} ${datePhrase} ${sessionPhrase} vì nguyên nhân sau: ${extraDetails}.`
    : `Em là ${fullName} thuộc phòng RnD, em gửi mail để ${reasonPhrase} ${datePhrase} ${sessionPhrase}. Kính mong lãnh đạo và nhân sự xem xét hỗ trợ.`;

  const text = [
    "Xin chào lãnh đạo và nhân sự CBT,",
    "",
    mainSentence,
    "",
    "Thân,",
    fullName,
  ].join("\n");

  const htmlMain = extraDetails
    ? `Em là <strong>${escapeHtml(fullName)}</strong> thuộc phòng RnD, em gửi mail để ${escapeHtml(reasonPhrase)} ${escapeHtml(datePhrase)} ${escapeHtml(sessionPhrase)} vì nguyên nhân sau: ${escapeHtml(extraDetails)}.`
    : `Em là <strong>${escapeHtml(fullName)}</strong> thuộc phòng RnD, em gửi mail để ${escapeHtml(reasonPhrase)} ${escapeHtml(datePhrase)} ${escapeHtml(sessionPhrase)}. Kính mong lãnh đạo và nhân sự xem xét hỗ trợ.`;

  const html = [
    "<p>Xin chào lãnh đạo và nhân sự CBT,</p>",
    `<p>${htmlMain}</p>`,
    `<p>Thân,<br>${escapeHtml(fullName)}</p>`,
  ].join("\n");

  return { text, html, subject: getEmailSubject(request) };
}
