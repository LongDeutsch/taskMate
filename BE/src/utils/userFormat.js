import { formatDateOnly } from "./birthday.js";

const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || "")
  .replace(/\/$/, "");

/** URL avatar trả về FE: data URL, absolute URL, hoặc path /avatars/... */
export function resolveAvatarForClient(avatar) {
  if (!avatar) return null;
  if (avatar.startsWith("data:") || avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }
  const path = avatar.startsWith("/") ? avatar : `/avatars/${avatar}`;
  return PUBLIC_API_URL ? `${PUBLIC_API_URL}${path}` : path;
}

/** Chuẩn hóa user trả về FE (không có password). */
export function formatPublicUser(user) {
  if (!user) return null;
  const { password: _pw, _id, ...rest } = user;
  return {
    ...rest,
    id: user._id ?? user.id,
    joinDate: formatDateOnly(user.joinDate),
    dateOfBirth: formatDateOnly(user.dateOfBirth),
    avatar: resolveAvatarForClient(user.avatar),
    roleLabel: user.roleLabel ?? (user.role === "ADMIN" ? "ADMIN" : "STAFF"),
  };
}
