// File: src/features/auth/pages/login-page.tsx
import { LoginForm } from "../components/login-form";

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginForm />
    </div>
  );
}
