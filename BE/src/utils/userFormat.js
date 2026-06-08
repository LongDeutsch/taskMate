import { formatDateOnly } from "./birthday.js";

const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || "")
  .replace(/\/$/, "");

/** URL ngắn cho FE — ảnh phục vụ qua GET /api/users/:id/avatar (không cần JWT, dùng được trong <img>). */
export function getPublicAvatarUrl(user) {
  if (!user?.avatar) return null;
  const id = user._id ?? user.id;
  if (!id) return null;
  const avatarPath = `/api/users/${id}/avatar`;
  return PUBLIC_API_URL ? `${PUBLIC_API_URL}${avatarPath}` : avatarPath;
}

/** Chuẩn hóa user trả về FE (không có password, không nhúng data URL). */
export function formatPublicUser(user, opts = {}) {
  if (!user) return null;
  const {
    password: _pw,
    webmailPasswordEnc: _enc,
    webmailPasswordHash: _hash,
    _id,
    avatar: _avatar,
    ...rest
  } = user;
  const base = {
    ...rest,
    id: user._id ?? user.id,
    joinDate: formatDateOnly(user.joinDate),
    dateOfBirth: formatDateOnly(user.dateOfBirth),
    avatar: getPublicAvatarUrl(user),
    roleLabel: user.roleLabel ?? (user.role === "ADMIN" ? "ADMIN" : "STAFF"),
  };
  if (opts.includeWebmail) {
    return {
      ...base,
      webmailUrl: user.webmailUrl ?? "https://mail.cybertech.com.vn/mail/",
      smtpHost: user.smtpHost ?? "mail.cybertech.com.vn",
      hasWebmailPassword: !!(user.webmailPasswordEnc || user.webmailPasswordHash),
    };
  }
  return base;
}
