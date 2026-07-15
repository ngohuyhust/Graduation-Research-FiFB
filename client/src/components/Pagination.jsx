// Component pagination dung chung trong giao dien.
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-slate-500">
        Page <span className="font-semibold text-ink">{page}</span> of{" "}
        <span className="font-semibold text-ink">{totalPages}</span>
      </span>
      <div className="flex items-center gap-2">
        <button className="btn-secondary" disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
          <ChevronLeft size={16} />
          Previous
        </button>
        <span className="rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-white shadow-sm">{page}</span>
        <button
          className="btn-secondary"
          disabled={page >= totalPages}
          type="button"
          onClick={() => onChange(page + 1)}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
