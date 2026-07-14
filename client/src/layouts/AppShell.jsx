import { Bell, Dumbbell, LogOut, Menu, Search, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import NotificationBadge from "../components/NotificationBadge";

const linkClass = ({ isActive }) => (isActive ? "sidebar-link-active" : "sidebar-link");

export default function AppShell({ navItems }) {
  const [open, setOpen] = useState(false);
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const searchMatches = useMemo(() => {
    const query = workspaceQuery.trim().toLowerCase();
    if (!query) return navItems.slice(0, 5);
    return navItems.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 5);
  }, [navItems, workspaceQuery]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function goToWorkspaceItem(item) {
    if (!item) return;
    navigate(item.to);
    setWorkspaceQuery("");
    setSearchOpen(false);
  }

  function handleWorkspaceSearch(event) {
    event.preventDefault();
    goToWorkspaceItem(searchMatches[0]);
  }

  return (
    <div className="min-h-screen bg-surface">
      {open && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm md:hidden"
          type="button"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col p-4 shadow-2xl transition-transform duration-300 md:translate-x-0 ${open ? "translate-x-0 animate-slide-in-left" : "-translate-x-full"}`}
      >
        <div className="mb-6 flex items-center justify-between">
          <Link className="flex items-center gap-3 text-lg font-bold text-white" to="/">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-mint text-white shadow-glow">
              <Dumbbell size={20} />
            </span>
            FiFB
          </Link>
          <button
            className="btn-ghost px-2.5 text-slate-300 hover:bg-white/10 hover:text-white md:hidden"
            type="button"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 border-t border-white/10 pt-4">
          {navItems.map((item) => (
            <NavLink className={linkClass} key={item.to} to={item.to} onClick={() => setOpen(false)}>
              {item.icon ? <item.icon size={18} /> : null}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint/20 text-mint-light">
              <User size={18} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {user?.fullName || user?.email || "FiFB user"}
              </div>
              <div className="mt-1 inline-flex rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                {user?.role || "member"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-100 bg-white/90 px-4 backdrop-blur-md md:px-8">
          <button className="btn-secondary px-3 md:hidden" type="button" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>
          <form className="relative hidden w-full max-w-md md:block" onSubmit={handleWorkspaceSearch}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="input rounded-full bg-slate-50 pl-10"
              placeholder="Search workspace"
              value={workspaceQuery}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
              onChange={(event) => {
                setWorkspaceQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
            />
            {searchOpen && searchMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
                {searchMatches.map((item) => (
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-surface-hover"
                    key={item.to}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToWorkspaceItem(item)}
                  >
                    {item.icon ? <item.icon className="text-slate-400" size={17} /> : null}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </form>
          <div className="flex items-center gap-3">
            <Link className="btn-secondary relative px-3" to="/notifications" title="Notifications">
              <Bell size={18} />
              <NotificationBadge />
            </Link>
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm text-slate-600 shadow-sm sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-mint/10 text-mint">
                <User size={16} />
              </span>
              <span className="max-w-40 truncate">{user?.fullName || user?.email}</span>
            </div>
            <button className="btn-secondary px-3" title="Logout" type="button" onClick={handleLogout}>
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
