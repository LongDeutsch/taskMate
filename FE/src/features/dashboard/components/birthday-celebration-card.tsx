import { useEffect } from "react";
import { playLightConfetti } from "@/shared/lib/confetti";
import { calcAgeFromDateOfBirth } from "@/shared/lib/birthday";

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
    playLightConfetti();
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-pink-200/80 bg-gradient-to-r from-pink-50 via-amber-50 to-violet-50 p-4 shadow-sm sm:p-5"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute -right-4 -top-4 text-4xl opacity-40 sm:text-5xl">
        🎉
      </div>
      <div className="pointer-events-none absolute -bottom-3 left-4 text-3xl opacity-30">
        🎂
      </div>

      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-base font-semibold text-pink-900 sm:text-lg">
            <span className="text-xl" aria-hidden>
              🎂
            </span>
            {titleText}
          </p>
          <p className="text-sm text-pink-800/90 [overflow-wrap:anywhere]">{subtitle}</p>
          {extraLine && (
            <p className="text-xs font-medium text-violet-700/80 [overflow-wrap:anywhere]">
              {extraLine}
            </p>
          )}
          {ageLine && (
            <p className="text-xs font-medium text-violet-700/80 [overflow-wrap:anywhere]">
              {ageLine}
            </p>
          )}
          {!ageLine && showAge && age != null && (
            <p className="text-xs font-medium text-violet-700/80">
              Hôm nay bạn tròn {age} tuổi 🎈
            </p>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 self-start rounded-full border border-pink-200/80 bg-white/70 px-3 py-1.5 text-sm font-medium text-pink-800 shadow-sm transition hover:bg-white hover:shadow"
          onClick={() => playLightConfetti()}
          aria-label="Bắn confetti chúc mừng"
        >
          🎉 Chúc mừng lại
        </button>
      </div>
    </div>
  );
}
