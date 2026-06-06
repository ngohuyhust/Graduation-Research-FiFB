export default function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-8 flex animate-fade-in flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-mint">FiFB / {title}</div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
