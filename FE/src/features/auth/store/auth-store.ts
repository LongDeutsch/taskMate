// File: src/features/auth/store/auth-store.ts
import type { User } from "@/shared/types";

const STORAGE_KEY = "taskmate_auth_user";

export function getStoredAuthUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** Không lưu data URL vào localStorage (vượt quota ~5MB). */
function slimUserForStorage(user: User): User {
  if (!user.avatar?.startsWith("data:")) return user;
  return { ...user, avatar: `/api/users/${user.id}/avatar` };
}

export function setStoredAuthUser(user: User | null): void {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const slim = slimUserForStorage(user);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    const { avatar: _a, ...withoutAvatar } = slim;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutAvatar));
  }
}
