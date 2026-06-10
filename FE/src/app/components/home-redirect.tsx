import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getHomePathForUser } from "../config/nav-items";

export function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={getHomePathForUser(user)} replace />;
}
