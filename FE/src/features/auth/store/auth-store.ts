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

export function setStoredAuthUser(user: User | null): void {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}
