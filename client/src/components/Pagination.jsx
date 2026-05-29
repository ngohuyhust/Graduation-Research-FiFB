export default function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-5 flex items-center justify-end gap-3 text-sm">
      <button className="btn-secondary" disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span className="text-slate-600">
        Page {page} of {totalPages}
      </span>
      <button className="btn-secondary" disabled={page >= totalPages} type="button" onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
