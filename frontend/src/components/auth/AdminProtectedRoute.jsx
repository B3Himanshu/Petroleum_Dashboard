import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ADMIN_TOKEN_KEY } from "@/services/api";

export function AdminProtectedRoute() {
  const location = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
