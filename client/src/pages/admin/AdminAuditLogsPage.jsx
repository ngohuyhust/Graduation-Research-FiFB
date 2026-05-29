import { adminApi } from "../../api/adminApi";
import DataTable from "../../components/DataTable";
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
      <DataTable columns={[{ key: "action", header: "Action" }, { key: "entityType", header: "Entity", render: (row) => row.entityType || row.entity_type }, { key: "actorId", header: "Actor", render: (row) => row.actorId || row.actor_id || "-" }, { key: "createdAt", header: "Created", render: (row) => formatDate(row.createdAt || row.created_at) }]} rows={asItems(data)} />
    </>
  );
}
