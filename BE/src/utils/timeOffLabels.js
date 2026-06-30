import {
  formatScheduleLineHtml,
  formatScheduleLineText,
  scheduleOverallDateRange,
  serializeBusinessTripSchedule,
} from "./businessTripSchedule.js";

const REASON_LABELS = {
  ANNUAL_LEAVE: "Nghỉ phép",
  WFH: "Work from home",
  LATE_ARRIVAL: "Xin đi trễ",
  EARLY_LEAVE: "Xin về sớm",
  BUSINESS_TRIP: "Công tác",
  OTHER: "Khác",
};

const SESSION_LABELS = {
  MORNING: "Sáng",
  AFTERNOON: "Chiều",
  FULL: "Cả ngày",
};

/** Cụm từ lý do trong nội dung email (sau "em gửi mail để"). */
const REASON_EMAIL_PHRASES = {
  ANNUAL_LEAVE: "xin nghỉ phép",
  WFH: "xin làm việc từ xa",
  LATE_ARRIVAL: "xin đi trễ",
  EARLY_LEAVE: "xin về sớm",
  BUSINESS_TRIP: "thông báo lịch công tác",
  OTHER: "gửi yêu cầu nghỉ/điều chỉnh lịch làm việc",
};

/** Tiêu đề email theo loại lý do. */
const REASON_EMAIL_SUBJECTS = {
  ANNUAL_LEAVE: "Đơn xin nghỉ phép",
  WFH: "Đề xuất làm việc từ xa",
  LATE_ARRIVAL: "Đơn xin đi trễ",
  EARLY_LEAVE: "Đơn xin về sớm",
  BUSINESS_TRIP: "Thông báo lịch công tác",
  OTHER: "Yêu cầu điều chỉnh lịch làm việc",
};

const SESSION_EMAIL_PHRASES = {
  MORNING: "trong buổi sáng",
  AFTERNOON: "trong buổi chiều",
  FULL: "cả ngày",
};

export function formatTimeOffReasonLabel(reason) {
  return REASON_LABELS[reason] ?? reason;
}

export function formatTimeOffSessionLabel(session) {
  return SESSION_LABELS[session] ?? session;
}

export function formatDateVi(isoDate) {
  const raw =
    isoDate instanceof Date ? isoDate.toISOString().slice(0, 10) : String(isoDate).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
}

export function formatTimeOffReasonTitle(reason, reasonOther) {
  if (reason === "OTHER") return String(reasonOther ?? "").trim() || REASON_LABELS.OTHER;
  return REASON_LABELS[reason] ?? reason;
}

function normalizeIsoDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

/** Cụm từ lý do tự nhiên trong email; lý do mới fallback lịch sự. */
export function formatTimeOffReasonEmailPhrase(reason) {
  if (REASON_EMAIL_PHRASES[reason]) return REASON_EMAIL_PHRASES[reason];
  const label = formatTimeOffReasonLabel(reason);
  if (!label || label === reason) return "xin hỗ trợ về lịch làm việc";
  return `xin hỗ trợ về ${label.toLowerCase()}`;
}

export function formatTimeOffSessionEmailPhrase(session) {
  return SESSION_EMAIL_PHRASES[session] ?? "cả ngày";
}

export function formatTimeOffDateEmailPhrase(startDate, endDate) {
  const start = normalizeIsoDate(startDate);
  const end = normalizeIsoDate(endDate);
  const startVi = formatDateVi(start);
  if (start === end) return `trong ngày ${startVi}`;
  return `từ ngày ${startVi} đến ngày ${formatDateVi(end)}`;
}

function getEmailReasonSubjectPrefix(request) {
  const reason = request.reason;
  if (reason === "BUSINESS_TRIP") return "Cập nhật lịch công tác";
  let prefix = REASON_EMAIL_SUBJECTS[reason];
  if (!prefix) {
    const label = formatTimeOffReasonLabel(reason);
    prefix = label && label !== reason ? `Yêu cầu ${label.toLowerCase()}` : "Yêu cầu liên quan lịch làm việc";
  }
  return prefix;
}

function getRequestDateRangeForEmail(request) {
  if (request.reason === "BUSINESS_TRIP") {
    const schedule = serializeBusinessTripSchedule(request.businessTripSchedule ?? []);
    const { start, end } = scheduleOverallDateRange(schedule);
    return {
      start: start ?? normalizeIsoDate(request.startDate),
      end: end ?? normalizeIsoDate(request.endDate),
    };
  }
  return {
    start: normalizeIsoDate(request.startDate),
    end: normalizeIsoDate(request.endDate),
  };
}

/** Tiêu đề: {Lý do} - {Họ tên} - {ngày bắt đầu} [đến ngày {kết thúc}] */
export function formatTimeOffEmailSubject(request) {
  const name = String(request.userName ?? "").trim() || "Nhân viên";
  const prefix = getEmailReasonSubjectPrefix(request);
  const { start, end } = getRequestDateRangeForEmail(request);
  const startVi = formatDateVi(start);
  if (start === end) return `${prefix} - ${name} - ${startVi}`;
  return `${prefix} - ${name} - ${startVi} đến ngày ${formatDateVi(end)}`;
}

function formatEmailDateRangePhrase(startDate, endDate) {
  const start = normalizeIsoDate(startDate);
  const end = normalizeIsoDate(endDate);
  const startVi = formatDateVi(start);
  if (start === end) return `ngày ${startVi}`;
  return `từ ngày ${startVi} đến ngày ${formatDateVi(end)}`;
}

function buildBusinessTripEmailContent(request, fullName) {
  const schedule = serializeBusinessTripSchedule(request.businessTripSchedule ?? []);
  const { start, end } = getRequestDateRangeForEmail(request);
  const datePhrase = formatEmailDateRangePhrase(start, end);
  const lines = schedule.map((item) => formatScheduleLineText(item));

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
    `<ul>${schedule.map((item) => formatScheduleLineHtml(item)).join("")}</ul>`,
    `<p>Thân,<br>${escapeHtml(fullName)}</p>`,
  ].join("\n");

  return { text, html, subject: formatTimeOffEmailSubject(request) };
}

/**
 * Soạn nội dung email xin off (plain text + HTML).
 */
export function buildTimeOffEmailContent(request) {
  const fullName = String(request.userName ?? "").trim() || "Nhân viên";
  if (request.reason === "BUSINESS_TRIP") {
    return buildBusinessTripEmailContent(request, fullName);
  }
  const reasonPhrase = formatTimeOffReasonEmailPhrase(request.reason);
  const datePhrase = formatTimeOffDateEmailPhrase(request.startDate, request.endDate);
  const sessionPhrase = formatTimeOffSessionEmailPhrase(request.session);
  const extraDetails = String(request.details ?? "")
    .trim()
    .replace(/[.。\s]+$/u, "");

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

  return { text, html, subject: formatTimeOffEmailSubject(request) };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
