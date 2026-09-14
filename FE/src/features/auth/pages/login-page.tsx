// File: src/features/auth/pages/login-page.tsx
import { LoginForm } from "../components/login-form";
import { LoginBirthdaySection } from "../components/login-birthday-section";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { Sparkles, CheckCircle2 } from "lucide-react";

export function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Layer 1: Dot grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-35 dark:opacity-20"
        aria-hidden
      />

      {/* Layer 2: Multi-layer Ambient Glow orbs */}
      <div
        className="pointer-events-none absolute -top-36 -left-36 size-[480px] rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-transparent blur-3xl dark:from-blue-600/20 dark:via-indigo-600/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-36 -right-36 size-[520px] rounded-full bg-gradient-to-tl from-purple-500/20 via-pink-500/15 to-transparent blur-3xl dark:from-purple-600/20 dark:via-pink-600/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[650px] rounded-full bg-gradient-to-tr from-sky-400/10 via-blue-500/5 to-purple-500/10 blur-3xl dark:from-sky-600/10 dark:via-blue-600/5 dark:to-purple-600/10"
        aria-hidden
      />

      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 z-50 sm:top-6 sm:right-8">
        <ThemeToggle
          variant="outline"
          className="size-10 rounded-full border-border/80 bg-card/80 shadow-xs backdrop-blur-md transition-all hover:bg-card hover:scale-105"
        />
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6 md:py-12">
        <div className="flex w-full max-w-[1040px] flex-col gap-6">
          <LoginBirthdaySection />

          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
            {/* Mascot Showcase Panel - harmonious & playful */}
            <div className="order-2 hidden md:flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-card/40 p-8 shadow-sm backdrop-blur-md dark:bg-card/25 dark:border-border/40 relative overflow-hidden group">
              {/* Backlit halo for Saitama */}
              <div
                className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] size-[280px] rounded-full bg-gradient-to-b from-blue-500/15 via-indigo-500/10 to-transparent blur-2xl"
                aria-hidden
              />

              {/* Mood badge */}
              <div className="relative z-10 mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50/80 px-3.5 py-1 text-xs font-medium text-blue-700 shadow-2xs backdrop-blur-xs dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Sẵn sàng hoàn thành mọi mục tiêu hôm nay!</span>
              </div>

              {/* Saitama character */}
              <div className="relative z-10 flex items-center justify-center">
                <img
                  src="/saitama_tasks.png"
                  alt="Saitama - Thêm Tasks"
                  className="max-h-[340px] w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02] drop-shadow-sm"
                  width={380}
                  height={450}
                />
              </div>

              {/* Playful quote container */}
              <div className="relative z-10 mt-4 w-full max-w-[340px] rounded-2xl border border-border/80 bg-card/90 px-4 py-2.5 text-center shadow-xs backdrop-blur-sm dark:bg-card/85">
                <p className="text-sm font-semibold text-foreground">
                  "Đăng nhập đi, task không tự thêm đâu 😐"
                </p>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  <span>Quản lý tiến độ & báo cáo dự án tinh gọn</span>
                </div>
              </div>
            </div>

            {/* Login Card Form */}
            <div className="order-1 flex w-full justify-center md:order-2 md:justify-start">
              <LoginForm />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-muted-foreground">
        <span>TaskMate © 2026 · Nền tảng quản lý công việc & tiến độ dự án</span>
      </footer>
    </div>
  );
}
