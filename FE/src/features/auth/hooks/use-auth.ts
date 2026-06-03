// File: src/features/auth/hooks/use-auth.ts
import { useState, useCallback, useEffect } from "react";
import type { User } from "@/shared/types";
import { getStoredAuthUser, setStoredAuthUser } from "@/features/auth/store/auth-store";
import { clearToken } from "@/shared/api";

export function useAuth(): {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
} {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredAuthUser());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handler = () => setUser(getStoredAuthUser());
    const storageHandler = (event: StorageEvent) => {
      if (event.key === "taskmate_auth_user" || event.key === "taskmate_token") {
        setUser(getStoredAuthUser());
      }
    };
    window.addEventListener("taskmate-auth-update", handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("taskmate-auth-update", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { login: doLogin } = await import("../api/login");
    const u = await doLogin(username, password);
    if (u) {
      setStoredAuthUser(u);
      setUser(u);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setStoredAuthUser(null);
    clearToken();
    setUser(null);
  }, []);

  const isAdmin = user?.role === "ADMIN";

  return { user, isAdmin, isLoading, login, logout };
}
