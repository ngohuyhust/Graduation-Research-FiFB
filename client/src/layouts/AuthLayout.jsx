import { Dumbbell } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between bg-ink p-8 text-white lg:p-10">
          <Link className="flex items-center gap-3 text-xl font-bold" to="/">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-mint">
              <Dumbbell size={22} />
            </span>
            FiFB
          </Link>
          <div className="py-12">
            <h1 className="max-w-md text-4xl font-bold leading-tight">Fitness tools for beginners, trainers, and admins.</h1>
            <p className="mt-4 max-w-md text-sm text-slate-300">
              Browse exercises, build workout plans, connect with trainers, and manage quality from one focused dashboard.
            </p>
          </div>
          <p className="text-xs text-slate-400">Frontend calls the FiFB backend API only.</p>
        </section>
        <section className="flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
