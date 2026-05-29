import { Bell, Dumbbell, LogOut, Menu, User } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const linkClass = ({ isActive }) =>
  `flex items-center rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-mint text-white" : "text-slate-600 hover:bg-slate-100"}`;

export default function AppShell({ navItems }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white p-4 transition md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <Link className="mb-6 flex items-center gap-3 text-lg font-bold text-ink" to="/">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-mint text-white">
            <Dumbbell size={20} />
          </span>
          FiFB
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink className={linkClass} key={item.to} to={item.to} onClick={() => setOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8">
          <button className="btn-secondary px-3 md:hidden" type="button" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="hidden text-sm text-slate-500 md:block">FiFB workspace</div>
          <div className="flex items-center gap-3">
            <Link className="btn-secondary px-3" to="/notifications">
              <Bell size={18} />
            </Link>
            <div className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
              <User size={17} />
              <span>{user?.fullName || user?.email}</span>
            </div>
            <button className="btn-secondary px-3" type="button" onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
