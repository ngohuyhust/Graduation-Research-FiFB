// Component form field dung chung trong giao dien.
import { AlertCircle } from "lucide-react";

export default function FormField({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
      {error && (
        <span className="mt-1.5 flex animate-fade-in items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle size={13} />
          {error}
        </span>
      )}
    </label>
  );
}
