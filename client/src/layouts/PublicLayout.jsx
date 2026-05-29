import { Dumbbell } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PublicLayout() {
  const { isAuthenticated, role } = useAuth();
  const home = role === "admin" ? "/admin" : role === "trainer" ? "/trainer" : "/profile";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link className="flex items-center gap-3 font-bold" to="/">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-mint text-white"><Dumbbell size={20} /></span>
            FiFB
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link className="btn-secondary" to="/exercises">Exercises</Link>
            <Link className="btn-secondary" to="/trainers">Trainers</Link>
            <Link className="btn-primary" to={isAuthenticated ? home : "/login"}>{isAuthenticated ? "Workspace" : "Login"}</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
