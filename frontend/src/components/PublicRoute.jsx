import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FullPageLoader from "./FullPageLoader";

export default function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <FullPageLoader message="Loading Sadhana..." />;

  if (isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
}
