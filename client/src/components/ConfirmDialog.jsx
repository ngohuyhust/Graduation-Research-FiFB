// Component confirm dialog dung chung trong giao dien.
import { AlertTriangle, HelpCircle } from "lucide-react";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", onCancel, onConfirm, danger }) {
  if (!open) return null;
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div
          className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl ${danger ? "bg-red-50 text-red-500" : "bg-emerald-50 text-mint"}`}
        >
          <Icon size={34} />
        </div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className={danger ? "btn-danger" : "btn-primary"} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
