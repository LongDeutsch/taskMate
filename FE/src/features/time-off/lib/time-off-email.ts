import type { BusinessTripScheduleItem, TimeOffReason, TimeOffSession } from "@/shared/types";

export type MailTemplateConfig = {
  department: string;
  greeting: string;
  bodyTemplate: string;
  businessGreeting: string;
  businessBodyTemplate: string;
  closing: string;
};

export const DEFAULT_MAIL_TEMPLATE: MailTemplateConfig = {
  department: "phòng RnD",
  greeting: "Xin chào lãnh đạo và nhân sự CBT,",
  bodyTemplate:
    "Em là {{fullName}} thuộc {{department}}, em gửi mail để {{actionPhrase}}{{detailsClause}}. Kính mong lãnh đạo và nhân sự xem xét hỗ trợ.",
  businessGreeting: "Dear anh/chị,",
  businessBodyTemplate:
    "Em là {{fullName}} thuộc {{department}}. Dưới sự chỉ đạo của ban lãnh đạo, em xin cập nhật lịch công tác {{datePhrase}} như sau:\n\n{{scheduleBlock}}",
  closing: "Thân,",
};

const REASON_EMAIL_SUBJECTS: Record<string, string> = {
  ANNUAL_LEAVE: "Đơn xin nghỉ phép",
  WFH: "Đề xuất làm việc từ xa",
  LATE_ARRIVAL: "Đơn xin đi trễ",
  EARLY_LEAVE: "Đơn xin về sớm",
  BUSINESS_TRIP: "Thông báo lịch công tác",
  OTHER: "Yêu cầu điều chỉnh lịch làm việc",
};

export function mergeMailTemplate(
  stored?: Partial<MailTemplateConfig> | null
): MailTemplateConfig {
  return {
    department: stored?.department?.trim() || DEFAULT_MAIL_TEMPLATE.department,
    greeting: stored?.greeting?.trim() || DEFAULT_MAIL_TEMPLATE.greeting,
    bodyTemplate: stored?.bodyTemplate?.trim() || DEFAULT_MAIL_TEMPLATE.bodyTemplate,
    businessGreeting:
      stored?.businessGreeting?.trim() || DEFAULT_MAIL_TEMPLATE.businessGreeting,
    businessBodyTemplate:
      stored?.businessBodyTemplate?.trim() || DEFAULT_MAIL_TEMPLATE.businessBodyTemplate,
    closing: stored?.closing?.trim() || DEFAULT_MAIL_TEMPLATE.closing,
  };
}

function applyPlaceholders(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value ?? "");
  }
  return out.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "");
}

function formatDateVi(iso: string): string {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatEmailDateRangePhrase(startDate: string, endDate: string): string {
  const start = String(startDate).slice(0, 10);
  const end = String(endDate).slice(0, 10);
  const startVi = formatDateVi(start);
  if (start === end) return `ngày ${startVi}`;
  return `từ ngày ${startVi} đến ngày ${formatDateVi(end)}`;
}

function sessionWord(session: TimeOffSession): string {
  if (session === "MORNING") return "buổi sáng";
  if (session === "AFTERNOON") return "buổi chiều";
  return "";
}

export function buildTimeOffActionPhrase(
  reason: TimeOffReason,
  session: TimeOffSession,
  startDate: string,
  endDate: string
): string {
  const datePhrase = formatEmailDateRangePhrase(startDate, endDate);
  const single = String(startDate).slice(0, 10) === String(endDate).slice(0, 10);
  const sw = sessionWord(session);

  if (reason === "LATE_ARRIVAL" || reason === "EARLY_LEAVE") {
    const verb = reason === "LATE_ARRIVAL" ? "xin phép đi trễ" : "xin phép về sớm";
    return sw ? `${verb} vào ${sw} ${datePhrase}` : `${verb} vào ${datePhrase}`;
  }

  const verb =
    reason === "WFH"
      ? "làm việc từ xa"
      : reason === "OTHER"
        ? "điều chỉnh lịch làm việc"
        : "nghỉ";
  if (!sw) {
    return single ? `${verb} trong ${datePhrase}` : `${verb} ${datePhrase}`;
  }
  return `${verb} ${sw} ${datePhrase}`;
}

function subjectPrefix(reason: TimeOffReason): string {
  if (reason === "BUSINESS_TRIP") return "Cập nhật lịch công tác";
  return REASON_EMAIL_SUBJECTS[reason] ?? "Yêu cầu liên quan lịch làm việc";
}

export function formatTimeOffEmailSubject(opts: {
  userName: string;
  reason: TimeOffReason;
  startDate: string;
  endDate: string;
}): string {
  const name = opts.userName.trim() || "Nhân viên";
  const prefix = subjectPrefix(opts.reason);
  const startVi = formatDateVi(opts.startDate);
  const end = String(opts.endDate).slice(0, 10);
  const start = String(opts.startDate).slice(0, 10);
  if (start === end) return `${prefix} - ${name} - ${startVi}`;
  return `${prefix} - ${name} - ${startVi} đến ngày ${formatDateVi(end)}`;
}

function scheduleLine(item: BusinessTripScheduleItem): string {
  const range =
    item.startDate === item.endDate
      ? formatDateVi(item.startDate)
      : `${formatDateVi(item.startDate)} → ${formatDateVi(item.endDate)}`;
  return `- ${range} | ${item.staff} | ${item.location} | ${item.description}`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function textToSimpleHtml(text: string): string {
  const blocks = String(text)
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export type BuildDraftInput = {
  userName: string;
  startDate: string;
  endDate: string;
  session: TimeOffSession;
  reason: TimeOffReason;
  details?: string;
  businessTripSchedule?: BusinessTripScheduleItem[];
  mailTemplate?: Partial<MailTemplateConfig> | null;
};

export type MailDraft = { subject: string; text: string; html: string };

/** Render bản nháp từ mẫu user + dữ liệu form (FE preview). */
export function buildMailDraftFromForm(input: BuildDraftInput): MailDraft {
  const tpl = mergeMailTemplate(input.mailTemplate);
  const fullName = input.userName.trim() || "Nhân viên";
  const subject = formatTimeOffEmailSubject({
    userName: fullName,
    reason: input.reason,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  if (input.reason === "BUSINESS_TRIP") {
    const schedule = input.businessTripSchedule ?? [];
    const start =
      schedule.reduce(
        (min, r) => (!min || r.startDate < min ? r.startDate : min),
        "" as string
      ) || input.startDate;
    const end =
      schedule.reduce((max, r) => (!max || r.endDate > max ? r.endDate : max), "" as string) ||
      input.endDate;
    const datePhrase = formatEmailDateRangePhrase(start, end);
    const scheduleBlock = schedule.map(scheduleLine).join("\n");
    const body = applyPlaceholders(tpl.businessBodyTemplate, {
      fullName,
      department: tpl.department,
      datePhrase,
      scheduleBlock,
      actionPhrase: "",
      details: "",
      detailsClause: "",
    });
    const text = [tpl.businessGreeting, "", body, "", tpl.closing, fullName].join("\n");
    const html = [
      `<p>${escapeHtml(tpl.businessGreeting)}</p>`,
      textToSimpleHtml(body).replace(escapeHtml(fullName), `<strong>${escapeHtml(fullName)}</strong>`),
      `<p>${escapeHtml(tpl.closing)}<br>${escapeHtml(fullName)}</p>`,
    ].join("\n");
    return { subject, text, html };
  }

  const actionPhrase = buildTimeOffActionPhrase(
    input.reason,
    input.session,
    input.startDate,
    input.endDate
  );
  const extraDetails = String(input.details ?? "")
    .trim()
    .replace(/[.。\s]+$/u, "");
  const detailsClause = extraDetails ? ` vì nguyên nhân sau: ${extraDetails}` : "";
  const body = applyPlaceholders(tpl.bodyTemplate, {
    fullName,
    department: tpl.department,
    actionPhrase,
    details: extraDetails,
    detailsClause,
    datePhrase: formatEmailDateRangePhrase(input.startDate, input.endDate),
    scheduleBlock: "",
  });
  const text = [tpl.greeting, "", body, "", tpl.closing, fullName].join("\n");
  const html = [
    `<p>${escapeHtml(tpl.greeting)}</p>`,
    `<p>${escapeHtml(body).replace(
      escapeHtml(fullName),
      `<strong>${escapeHtml(fullName)}</strong>`
    )}</p>`,
    `<p>${escapeHtml(tpl.closing)}<br>${escapeHtml(fullName)}</p>`,
  ].join("\n");
  return { subject, text, html };
}
