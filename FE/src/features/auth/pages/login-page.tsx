// File: src/features/auth/pages/login-page.tsx
import { LoginForm } from "../components/login-form";
import { LoginBirthdaySection } from "../components/login-birthday-section";

const TAGLINE = "Đăng nhập đi, task không tự thêm đâu 😐";

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-8 md:px-8">
      <div className="flex w-full max-w-[1120px] flex-col gap-6">
        <LoginBirthdaySection />

        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[minmax(0,1fr)_420px] md:gap-[96px]">
        {/* Login card first on mobile */}
        <div className="order-1 flex w-full justify-center md:order-2 md:justify-start">
          <LoginForm />
        </div>

        {/* Mascot — secondary visual */}
        <div className="order-2 flex flex-col items-center md:order-1 md:items-start">
          <div className="relative hidden min-[481px]:flex min-[481px]:flex-col min-[481px]:items-center md:items-start">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 size-[min(88vw,340px)] -translate-x-1/2 -translate-y-[42%] rounded-full bg-gray-100/90 md:left-[38%] md:size-[380px] md:-translate-x-1/2 md:-translate-y-1/2"
              aria-hidden
            />
            <img
              src="/saitama_tasks.png"
              alt=""
              role="presentation"
              className="relative z-10 h-auto w-[260px] max-w-full object-contain object-bottom sm:w-[300px] md:w-[440px]"
              width={440}
              height={520}
            />
            <p className="relative z-10 mt-5 max-w-[440px] text-center text-sm leading-relaxed text-[#6b7280] md:text-left">
              {TAGLINE}
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
