// File: src/features/auth/components/login-form.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getHomePathForUser } from "@/app/config/nav-items";
import { getStoredAuthUser } from "@/features/auth/store/auth-store";
import { useAuth } from "../hooks/use-auth";
import { loginSchema, type LoginFormValues } from "../schemas/login-schema";
import { isUsingRealApi, apiBaseUrl } from "@/shared/api";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const inputClass = cn(
  "h-12 w-full rounded-[11px] border-[#d1d5db] bg-white px-4 text-[15px] text-[#111827] shadow-none",
  "placeholder:text-[#9ca3af]",
  "focus-visible:border-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]/10"
);

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});

  const isDev = import.meta.env.DEV;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setErrors({});
    const form = e.currentTarget;
    const data: LoginFormValues = {
      username: (form.elements.namedItem("username") as HTMLInputElement).value.trim(),
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    };
    const result = loginSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginFormValues, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof LoginFormValues;
        if (path) fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      const ok = await login(result.data.username, result.data.password);
      if (ok) {
        navigate(getHomePathForUser(getStoredAuthUser()), { replace: true });
      } else {
        setError("Invalid username or password.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full max-w-[420px] rounded-[18px] border border-[#e5e7eb] bg-white p-8"
      style={{ boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)" }}
    >
      <header className="mb-7">
        <h1 className="text-[26px] font-extrabold tracking-tight text-[#111827]">TaskMate</h1>
        <p className="mt-1.5 text-sm text-[#6b7280]">Sign in to your account</p>
        <p className="mt-2 text-xs text-[#9ca3af]">Một cú sign in, ngàn task đang chờ.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            className="rounded-[10px] bg-red-50 px-3 py-2.5 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-[#374151]">
            Username
          </Label>
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="pm"
            autoComplete="username"
            disabled={loading}
            aria-invalid={!!errors.username}
            className={inputClass}
          />
          {errors.username && <p className="text-sm text-red-600">{errors.username}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-[#374151]">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
              aria-invalid={!!errors.password}
              className={cn(inputClass, "pr-11")}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9ca3af] transition-colors hover:text-[#374151]"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[11px]",
            "bg-[#111827] text-sm font-semibold text-white",
            "transition-colors duration-200",
            "hover:bg-[#1f2937] active:bg-[#030712]",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>

        {isDev && (
          <p className="pt-1 text-center text-xs leading-relaxed text-[#9ca3af]">
            {isUsingRealApi ? (
              <>
                Dev API:{" "}
                <span className="break-all text-[#6b7280]">{apiBaseUrl || "—"}</span>
              </>
            ) : (
              <>
                Dev mode: Mock API — set{" "}
                <code className="rounded bg-gray-100 px-1 text-[11px]">VITE_API_URL</code> in{" "}
                <code className="rounded bg-gray-100 px-1 text-[11px]">FE/.env</code>
              </>
            )}
          </p>
        )}
      </form>
    </div>
  );
}
