import crypto from "crypto";
import { formatDateOnly } from "./birthday.js";

const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || "")
  .replace(/\/$/, "");

/** Fingerprint ngắn — đổi khi nội dung avatar trong DB đổi. */
function avatarVersionToken(storedAvatar) {
  if (!storedAvatar) return null;
  return crypto.createHash("sha1").update(String(storedAvatar)).digest("hex").slice(0, 12);
}

/** URL avatar công khai — kèm ?v= để tránh cache ảnh cũ sau khi user đổi profile. */
export function getPublicAvatarUrl(user) {
  const id = user?._id ?? user?.id;
  if (!id || !user?.avatar) return null;
  const token = avatarVersionToken(user.avatar);
  if (!token) return null;
  const avatarPath = `/api/users/${id}/avatar?v=${token}`;
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
