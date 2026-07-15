// Layout public layout tao khung giao dien cho cac trang.
import { Dumbbell } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PublicLayout() {
  const { isAuthenticated, role } = useAuth();
  const home = role === "admin" ? "/admin" : role === "trainer" ? "/trainer" : "/profile";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-18 min-h-16 max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link className="flex items-center gap-3 text-lg font-bold" to="/">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint text-white shadow-glow">
              <Dumbbell size={22} />
            </span>
            FiFB
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              className="rounded-lg px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink hover:underline hover:underline-offset-4"
              to="/exercises"
            >
              Exercises
            </Link>
            <Link
              className="rounded-lg px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink hover:underline hover:underline-offset-4"
              to="/trainers"
            >
              Trainers
            </Link>
            <Link className="btn-primary" to={isAuthenticated ? home : "/login"}>
              {isAuthenticated ? "Workspace" : "Login"}
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
