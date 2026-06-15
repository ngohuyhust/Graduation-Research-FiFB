import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="panel flex items-start gap-3 border-l-4 border-l-red-400 bg-red-50/80 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 shrink-0" size={20} />
      <div className="min-w-0">
        <div className="font-semibold">{message || "Unable to load data"}</div>
        <p className="mt-1 text-red-600/80">
          The request could not be completed. Try again when the connection is ready.
        </p>
        {onRetry && (
          <button
            className="btn-secondary mt-3 border-red-200 text-red-700 hover:bg-red-100"
            type="button"
            onClick={onRetry}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
