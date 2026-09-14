// File: src/shared/lib/theme.ts
import { useEffect, useState, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "taskmate-theme";

let currentTheme: ThemeMode = (function () {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") {
    return saved;
  }
  return "system";
})();

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function isSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const effectiveDark =
    theme === "dark" || (theme === "system" && isSystemDark());

  if (effectiveDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function getTheme(): ThemeMode {
  return currentTheme;
}

export function setTheme(theme: ThemeMode) {
  currentTheme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore localStorage write error
  }
  applyTheme(theme);
  notify();
}

export function toggleTheme() {
  const isDark =
    currentTheme === "dark" || (currentTheme === "system" && isSystemDark());
  setTheme(isDark ? "light" : "dark");
}

export function initTheme() {
  applyTheme(currentTheme);

  if (typeof window !== "undefined") {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (currentTheme === "system") {
        applyTheme("system");
        notify();
      }
    };
    media.addEventListener("change", handler);
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => currentTheme,
    () => "system" as ThemeMode
  );

  const [systemDark, setSystemDark] = useState(() => isSystemDark());

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemDark);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
  };
}
