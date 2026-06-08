import { formatDateOnly } from "./birthday.js";

export function getAvatarUrl(filename) {
  if (!filename) return null;
  return `/avatars/${filename}`;
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
    avatar: user.avatar ? getAvatarUrl(user.avatar) : null,
    roleLabel: user.roleLabel ?? (user.role === "ADMIN" ? "ADMIN" : "STAFF"),
  };
}
