import { Navigate, Outlet, useLocation } from "react-router-dom";
import { USER_TOKEN_KEY, ADMIN_TOKEN_KEY } from "@/services/api";

function tokenLooksValid(key) {
  const t = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!t) return false;
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    const exp = payload.exp * 1000;
    return Date.now() < exp;
  } catch {
    return false;
  }
}

export function ProtectedRoute() {
  const location = useLocation();
  const ok =
    tokenLooksValid(USER_TOKEN_KEY) || tokenLooksValid(ADMIN_TOKEN_KEY);
  if (!ok) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
