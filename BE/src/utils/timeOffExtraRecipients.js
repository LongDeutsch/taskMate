import { createBadRequestError } from "./errors.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Chuẩn hóa danh sách người nhận khác (email + isDefault), loại trùng.
 * @param {unknown} raw
 * @returns {{ email: string, isDefault: boolean }[]}
 */
export function normalizeTimeOffExtraRecipients(raw) {
  if (raw === undefined) return undefined;
  if (raw === null) return [];
  let list = raw;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      throw createBadRequestError("timeOffExtraRecipients không hợp lệ");
    }
  }
  if (!Array.isArray(list)) {
    throw createBadRequestError("timeOffExtraRecipients phải là mảng");
  }
  if (list.length > 50) {
    throw createBadRequestError("Tối đa 50 email người nhận khác");
  }

  const seen = new Set();
  const out = [];
  for (const item of list) {
    const email = String(item?.email ?? item ?? "")
      .trim()
      .toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email)) {
      throw createBadRequestError(`Email không hợp lệ: ${email}`);
    }
    if (seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      isDefault: Boolean(item?.isDefault),
    });
  }
  return out;
}

/**
 * Chuẩn hóa mảng email gửi kèm job (không lưu DB).
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeAdditionalEmails(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw createBadRequestError("additionalEmails phải là mảng");
  }
  if (raw.length > 50) {
    throw createBadRequestError("Tối đa 50 email người nhận khác mỗi lần gửi");
  }
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const email = String(item ?? "")
      .trim()
      .toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email)) {
      throw createBadRequestError(`Email không hợp lệ: ${email}`);
    }
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/** Chuẩn hóa an toàn khi trả FE (không throw). */
export function formatTimeOffExtraRecipients(raw) {
  try {
    return normalizeTimeOffExtraRecipients(raw ?? []) ?? [];
  } catch {
    return [];
  }
}
