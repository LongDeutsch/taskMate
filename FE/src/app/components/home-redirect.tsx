import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getRoleLabel } from "@/shared/types";

export function HomeRedirect() {
  const { user } = useAuth();
  const roleLabel = user ? getRoleLabel(user) : "STAFF";
  if (roleLabel === "HR") return <Navigate to="/users" replace />;
  return <Navigate to="/dashboard" replace />;
}
