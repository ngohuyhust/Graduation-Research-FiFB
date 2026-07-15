// Component empty state dung chung trong giao dien.
import { Inbox } from "lucide-react";

export default function EmptyState({ title = "No data", description = "There is nothing to show yet." }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      <Inbox className="mb-4 text-slate-300" size={48} />
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
