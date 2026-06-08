import { apiBaseUrl } from "@/shared/api";

/** Ghép URL avatar đầy đủ (data URL, absolute, hoặc BE + /avatars/...). */
export function resolveAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  if (avatar.startsWith("data:") || avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }
  const path = avatar.startsWith("/") ? avatar : `/avatars/${avatar}`;
  const base = apiBaseUrl.replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}
