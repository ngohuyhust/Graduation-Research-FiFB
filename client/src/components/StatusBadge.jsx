const styles = {
  active: "bg-emerald-100 text-emerald-700",
  approved: "bg-emerald-100 text-emerald-700",
  verified: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  pending_verification: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  disabled: "bg-red-100 text-red-700",
  locked: "bg-orange-100 text-orange-700",
  inactive: "bg-slate-200 text-slate-700",
  archived: "bg-slate-200 text-slate-700",
};

export default function StatusBadge({ value }) {
  const label = value === true ? "verified" : value === false ? "unverified" : value || "-";
  const key = String(label).toLowerCase();
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[key] || "bg-slate-100 text-slate-700"}`}>{label}</span>;
}
