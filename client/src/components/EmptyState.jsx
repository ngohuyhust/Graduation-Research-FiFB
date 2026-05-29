export default function EmptyState({ title = "No data", description = "There is nothing to show yet." }) {
  return (
    <div className="panel text-center">
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
