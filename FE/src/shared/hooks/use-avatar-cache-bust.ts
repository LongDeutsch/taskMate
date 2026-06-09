import { useEffect, useState } from "react";

const STORAGE_KEY = "taskmate_avatar_ts";

/** Timestamp bust cache avatar — cập nhật khi user lưu profile. */
export function useAvatarCacheBust() {
  const [ts, setTs] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) ?? "0" : "0"
  );

  useEffect(() => {
    const sync = () => setTs(localStorage.getItem(STORAGE_KEY) ?? "0");
    sync();
    window.addEventListener("taskmate-auth-update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("taskmate-auth-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return ts;
}
