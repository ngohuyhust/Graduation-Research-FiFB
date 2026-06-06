import EmptyState from "./EmptyState";

export default function DataTable({ columns, rows, emptyTitle }) {
  if (!rows?.length) return <EmptyState title={emptyTitle || "No records"} />;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              {columns.map((column) => (
                <th className="px-5 py-3 font-semibold" key={column.key}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr className="align-top transition-colors hover:bg-surface-hover even:bg-slate-50/50" key={row.id || index}>
                {columns.map((column) => (
                  <td className="px-5 py-4 text-slate-700" key={column.key}>
                    {column.render ? column.render(row) : row[column.key] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
