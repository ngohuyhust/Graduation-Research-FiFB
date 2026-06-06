import { adminApi } from "../../api/adminApi";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { useAsync } from "../../hooks/useAsync";
import { asItems, formatDate } from "../../utils/format";

export default function AdminAuditLogsPage() {
  const { data, loading, error, reload } = useAsync(() => adminApi.auditLogs({ page: 1, limit: 50 }), []);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Audit Logs" />
      <div className="space-y-3">
        {asItems(data).length ? asItems(data).map((row) => (
          <div className="panel flex gap-4" key={row.id || `${row.action}-${row.createdAt || row.created_at}`}>
            <div className="mt-1 h-3 w-3 rounded-full bg-mint shadow-glow" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink">{row.action || "-"}</div>
              <div className="mt-1 text-sm text-slate-500">{row.entityType || row.entity_type || "-"} · <span className="font-mono">{row.actorId || row.actor_id || "-"}</span></div>
              <div className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-400">{formatDate(row.createdAt || row.created_at)}</div>
            </div>
          </div>
        )) : <EmptyState title="No audit logs" />}
      </div>
    </>
  );
}
