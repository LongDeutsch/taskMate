import { useEffect } from "react";
import { playLightConfetti } from "@/shared/lib/confetti";
import { calcAgeFromDateOfBirth } from "@/shared/lib/birthday";
import { cn } from "@/shared/lib/utils";

type BirthdayCelebrationCardProps = {
  fullName: string;
  dateOfBirth?: string;
  showAge?: boolean;
  /** Ví dụ: " các bạn" hoặc " Phạm Văn D" */
  titleSuffix?: string;
  /** true → "Chúc mừng sinh nhật bạn, Tên!"; false → "Chúc mừng sinh nhật Tên!" */
  titleUseBan?: boolean;
  subtitle?: string;
  /** Ghi đè dòng tuổi mặc định (vd. chúc đồng nghiệp) */
  ageLine?: string;
  /** Dòng phụ (liệt kê tên đầy đủ) */
  extraLine?: string;
  /** Sidebar hẹp — layout gọn */
  variant?: "default" | "sidebar";
  /** Bắn confetti khi mount (tắt trên sidebar nếu cần) */
  playConfettiOnMount?: boolean;
};

export function BirthdayCelebrationCard({
  fullName,
  dateOfBirth = "",
  showAge = true,
  titleSuffix,
  titleUseBan = true,
  subtitle = "Chúc bạn tuổi mới nhiều năng lượng, ít bug và nhiều task done!",
  ageLine,
  extraLine,
  variant = "default",
  playConfettiOnMount = true,
}: BirthdayCelebrationCardProps) {
  const age = dateOfBirth ? calcAgeFromDateOfBirth(dateOfBirth) : null;
  const firstName = fullName.trim().split(/\s+/).pop() ?? fullName;

  const titleText = (() => {
    if (titleSuffix !== undefined) {
      return `Chúc mừng sinh nhật${titleSuffix}!`;
    }
    if (titleUseBan && firstName) {
      return `Chúc mừng sinh nhật bạn, ${firstName}!`;
    }
    if (fullName) {
      return `Chúc mừng sinh nhật ${fullName}!`;
    }
    return "Chúc mừng sinh nhật bạn!";
  })();

  useEffect(() => {
    if (playConfettiOnMount) playLightConfetti();
  }, [playConfettiOnMount]);

  const isSidebar = variant === "sidebar";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-pink-200/80 bg-gradient-to-br from-pink-50 via-amber-50 to-violet-50 shadow-sm",
        isSidebar ? "p-3" : "rounded-2xl p-4 shadow-sm sm:p-5"
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-none absolute opacity-40",
          isSidebar ? "-right-2 -top-2 text-2xl" : "-right-4 -top-4 text-4xl sm:text-5xl"
        )}
      >
        🎉
      </div>
      {!isSidebar && (
        <div className="pointer-events-none absolute -bottom-3 left-4 text-3xl opacity-30">
          🎂
        </div>
      )}

      <div
        className={cn(
          "relative flex flex-col gap-2",
          !isSidebar && "sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              "flex items-start gap-1.5 font-semibold text-pink-900 [overflow-wrap:anywhere]",
              isSidebar ? "text-xs leading-snug" : "text-base sm:text-lg"
            )}
          >
            <span className={isSidebar ? "text-sm" : "text-xl"} aria-hidden>
              🎂
            </span>
            {titleText}
          </p>
          <p
            className={cn(
              "text-pink-800/90 [overflow-wrap:anywhere]",
              isSidebar ? "text-[11px] leading-relaxed" : "text-sm"
            )}
          >
            {subtitle}
          </p>
          {extraLine && (
            <p
              className={cn(
                "font-medium text-violet-700/80 [overflow-wrap:anywhere]",
                isSidebar ? "text-[10px] leading-relaxed" : "text-xs"
              )}
            >
              {extraLine}
            </p>
          )}
          {ageLine && (
            <p
              className={cn(
                "font-medium text-violet-700/80 [overflow-wrap:anywhere]",
                isSidebar ? "text-[10px]" : "text-xs"
              )}
            >
              {ageLine}
            </p>
          )}
          {!ageLine && showAge && age != null && (
            <p className={cn("font-medium text-violet-700/80", isSidebar ? "text-[10px]" : "text-xs")}>
              Hôm nay bạn tròn {age} tuổi 🎈
            </p>
          )}
        </div>
        <button
          type="button"
          className={cn(
            "shrink-0 rounded-full border border-pink-200/80 bg-white/70 font-medium text-pink-800 shadow-sm transition hover:bg-white hover:shadow",
            isSidebar
              ? "w-full px-2 py-1 text-[11px]"
              : "self-start px-3 py-1.5 text-sm"
          )}
          onClick={() => playLightConfetti()}
          aria-label="Bắn confetti chúc mừng"
        >
          🎉 Chúc mừng lại
        </button>
      </div>
    </div>
  );
}
