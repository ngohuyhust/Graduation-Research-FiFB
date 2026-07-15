// Component loading state dung chung trong giao dien.
import { Loader2 } from "lucide-react";

export default function LoadingState({ label = "Loading..." }) {
  return (
    <div className="panel space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <Loader2 className="animate-spin text-mint" size={18} />
        {label}
      </div>
      <div className="space-y-2">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
      </div>
    </div>
  );
}
