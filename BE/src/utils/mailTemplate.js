/**
 * Mẫu email Xin off theo user — placeholder:
 * {{fullName}} {{department}} {{actionPhrase}} {{details}} {{detailsClause}}
 * {{datePhrase}} {{scheduleBlock}} {{subjectPrefix}} {{dateRange}}
 */

export const DEFAULT_MAIL_TEMPLATE = {
  department: "phòng RnD",
  greeting: "Xin chào lãnh đạo và nhân sự CBT,",
  bodyTemplate:
    "Em là {{fullName}} thuộc {{department}}, em gửi mail để {{actionPhrase}}{{detailsClause}}. Kính mong lãnh đạo và nhân sự xem xét hỗ trợ.",
  businessGreeting: "Dear anh/chị,",
  businessBodyTemplate:
    "Em là {{fullName}} thuộc {{department}}. Dưới sự chỉ đạo của ban lãnh đạo, em xin cập nhật lịch công tác {{datePhrase}} như sau:\n\n{{scheduleBlock}}",
  closing: "Thân,",
};

const MAX_FIELD = 2000;

function safeJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function normalizeMailTemplate(input) {
  if (input === undefined) return undefined;
  if (input === null) return { ...DEFAULT_MAIL_TEMPLATE };

  const src = typeof input === "string" ? safeJson(input) : input;
  if (!src || typeof src !== "object") return { ...DEFAULT_MAIL_TEMPLATE };

  const pick = (key, fallback) => {
    if (src[key] === undefined || src[key] === null) return fallback;
    const v = String(src[key]).trim();
    if (!v) return fallback;
    return v.slice(0, MAX_FIELD);
  };

  return {
    department: pick("department", DEFAULT_MAIL_TEMPLATE.department),
    greeting: pick("greeting", DEFAULT_MAIL_TEMPLATE.greeting),
    bodyTemplate: pick("bodyTemplate", DEFAULT_MAIL_TEMPLATE.bodyTemplate),
    businessGreeting: pick("businessGreeting", DEFAULT_MAIL_TEMPLATE.businessGreeting),
    businessBodyTemplate: pick(
      "businessBodyTemplate",
      DEFAULT_MAIL_TEMPLATE.businessBodyTemplate
    ),
    closing: pick("closing", DEFAULT_MAIL_TEMPLATE.closing),
  };
}

export function mergeMailTemplate(stored) {
  return normalizeMailTemplate(stored ?? DEFAULT_MAIL_TEMPLATE);
}

export function applyPlaceholders(template, vars) {
  let out = String(template ?? "");
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value == null ? "" : String(value));
  }
  return out.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "");
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function textToSimpleHtml(text) {
  const blocks = String(text ?? "")
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks
    .map((block) => {
      const withBreaks = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p>${withBreaks}</p>`;
    })
    .join("\n");
}
