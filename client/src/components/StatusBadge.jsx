// Component status badge dung chung trong giao dien.
const styles = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  verified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  pending_verification: "bg-amber-50 text-amber-700 ring-amber-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  disabled: "bg-red-50 text-red-700 ring-red-200",
  locked: "bg-orange-50 text-orange-700 ring-orange-200",
  inactive: "bg-slate-100 text-slate-700 ring-slate-200",
  archived: "bg-slate-100 text-slate-700 ring-slate-200",
  unverified: "bg-slate-100 text-slate-700 ring-slate-200",
};

export default function StatusBadge({ value }) {
  const label = value === true ? "verified" : value === false ? "unverified" : value || "-";
  const key = String(label).toLowerCase();
  const dotClass = key.includes("pending") ? "animate-pulse-dot" : "";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ${styles[key] || "bg-slate-100 text-slate-700 ring-slate-200"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${dotClass}`} />
      {label}
    </span>
  );
}
