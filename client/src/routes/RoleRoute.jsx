// Dinh nghia dieu huong va bao ve route role route.
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RoleRoute({ roles }) {
  const { role } = useAuth();
  if (!roles.includes(role)) return <Navigate replace to="/" />;
  return <Outlet />;
}
