import { trainerApi } from "../../api/trainerApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function ConnectionsPage() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [requests, connections] = await Promise.all([trainerApi.requests(), trainerApi.connections()]);
    return { requests, connections };
  }, []);

  async function cancel(id) {
    try {
      await trainerApi.cancelRequest(id);
      showSuccess("Request cancelled");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Trainer Connections" />
      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Requests</h2>
        <DataTable
          columns={[
            { key: "trainerId", header: "Trainer", render: (row) => row.trainerName || row.trainer_id || row.trainerId || "-" },
            { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
            { key: "actions", header: "Actions", render: (row) => row.status === "pending" ? <button className="btn-secondary" type="button" onClick={() => cancel(row.id)}>Cancel</button> : "-" },
          ]}
          rows={asItems(data.requests)}
        />
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Connections</h2>
        <DataTable columns={[{ key: "trainerId", header: "Trainer", render: (row) => row.trainerName || row.trainer_id || row.trainerId || "-" }, { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> }]} rows={asItems(data.connections)} />
      </section>
    </>
  );
}
