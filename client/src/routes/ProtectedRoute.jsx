import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute() {
  const { bootstrapping, isAuthenticated } = useAuth();
  const location = useLocation();

  if (bootstrapping) return <LoadingState label="Checking session..." />;
  if (!isAuthenticated) return <Navigate replace state={{ from: location }} to="/login" />;
  return <Outlet />;
}
