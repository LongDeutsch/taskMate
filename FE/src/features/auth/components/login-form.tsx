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
import { CheckSquare, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const inputClass = cn(
  "h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] text-foreground shadow-2xs transition-colors",
  "placeholder:text-muted-foreground/70",
  "focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
);

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});

  const isDev = import.meta.env.DEV;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setErrors({});
    const data: LoginFormValues = {
      username: username.trim(),
      password,
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
        setError("Tên đăng nhập hoặc mật khẩu không chính xác.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tên đăng nhập hoặc mật khẩu không chính xác.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full max-w-[420px] rounded-3xl border border-border/80 bg-card/90 p-7 sm:p-8 text-card-foreground shadow-xl shadow-slate-900/5 backdrop-blur-md dark:border-border dark:bg-card/85 dark:shadow-2xl dark:shadow-black/50"
    >
      <header className="mb-6 space-y-3">
        {/* Branding Logo & Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-blue-500/25">
              <CheckSquare className="size-5" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-violet-400">
              TaskMate
            </span>
          </div>
          <span className="rounded-full border border-blue-200/80 bg-blue-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300">
            v2.0 Workspace
          </span>
        </div>

        <div>
          <h1 className="text-lg font-bold text-foreground">Đăng nhập tài khoản</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Một cú chạm, ngàn task sẵn sàng hoàn thành.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="rounded-xl border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 animate-in fade-in duration-200"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-xs font-semibold text-foreground">
            Tên đăng nhập
          </Label>
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="Nhập tên đăng nhập..."
            autoComplete="username"
            disabled={loading}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
            }}
            aria-invalid={!!errors.username}
            className={inputClass}
          />
          {errors.username && <p className="text-xs text-red-600 dark:text-red-400">{errors.username}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold text-foreground">
            Mật khẩu
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              aria-invalid={!!errors.password}
              className={cn(inputClass, "pr-11")}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl mt-2",
            "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-sm font-semibold text-white",
            "shadow-md shadow-blue-500/25 transition-all duration-200",
            "hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 active:scale-[0.99]",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Đang đăng nhập...
            </>
          ) : (
            "Đăng nhập"
          )}
        </button>

        {isDev && (
          <p className="pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
            {isUsingRealApi ? (
              <>
                Dev API:{" "}
                <span className="break-all text-foreground">{apiBaseUrl || "—"}</span>
              </>
            ) : (
              <>
                Chế độ thử nghiệm: Mock API — chỉnh{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-foreground">VITE_API_URL</code> trong{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-foreground">FE/.env</code>
              </>
            )}
          </p>
        )}
      </form>
    </div>
  );
}
