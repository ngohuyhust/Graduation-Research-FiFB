import { Dumbbell } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-ink via-ink-light to-emerald-950 p-10 text-white lg:flex">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:28px_28px]" />
          <Dumbbell className="absolute -right-24 bottom-12 rotate-[-18deg] text-white/5" size={360} />
          <Link className="relative z-10 flex items-center gap-3 text-xl font-bold" to="/">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint text-white shadow-glow">
              <Dumbbell size={22} />
            </span>
            FiFB
          </Link>
          <div className="relative z-10 max-w-xl py-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-mint-light">
              Fitness intelligence for better routines
            </p>
            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              Build a sharper{" "}
              <span className="bg-gradient-to-r from-mint to-mint-light bg-clip-text text-transparent">Fitness</span>{" "}
              workflow.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
              Browse exercises, build workout plans, connect with trainers, and manage quality from one focused
              dashboard.
            </p>
          </div>
          <p className="relative z-10 text-xs text-slate-400">FiFB workspace · visual redesign v1</p>
        </section>
        <section className="relative flex min-h-screen items-center justify-center bg-white p-6">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-mint/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-steel/5 blur-3xl" />
          <div className="relative z-10 w-full max-w-md">
            <Link className="mb-10 flex items-center gap-3 text-lg font-bold text-ink lg:hidden" to="/">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-mint text-white">
                <Dumbbell size={21} />
              </span>
              FiFB
            </Link>
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
