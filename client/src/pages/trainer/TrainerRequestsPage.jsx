import { useForm } from "react-hook-form";
import { trainerApi } from "../../api/trainerApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function TrainerRequestsPage() {
  const { data, loading, error, reload } = useAsync(trainerApi.incomingRequests, []);
  const rejectForm = useForm({ defaultValues: { id: "", rejectReason: "" } });

  async function approve(id) {
    try {
      await trainerApi.approveRequest(id);
      showSuccess("Request approved");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  async function reject(values) {
    try {
      await trainerApi.rejectRequest(values.id, values.rejectReason);
      rejectForm.reset();
      showSuccess("Request rejected");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Connection Requests" />
      <DataTable
        columns={[
          { key: "user", header: "User", render: (row) => row.userName || row.user_id || row.userId || "-" },
          { key: "goal", header: "Goal", render: (row) => row.goalSnapshot || row.goal_snapshot || "-" },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "actions", header: "Actions", render: (row) => row.status === "pending" ? <div className="flex gap-2"><button className="btn-primary" type="button" onClick={() => approve(row.id)}>Approve</button><button className="btn-secondary" type="button" onClick={() => rejectForm.setValue("id", row.id)}>Reject</button></div> : "-" },
        ]}
        rows={asItems(data)}
      />
      {rejectForm.watch("id") && (
        <form className="panel mt-6 space-y-3" onSubmit={rejectForm.handleSubmit(reject)}>
          <h2 className="font-semibold">Reject request</h2>
          <textarea className="input min-h-24" placeholder="Reject reason" {...rejectForm.register("rejectReason", { required: true })} />
          <div className="flex gap-2">
            <button className="btn-danger" type="submit">Reject</button>
            <button className="btn-secondary" type="button" onClick={() => rejectForm.reset()}>Cancel</button>
          </div>
        </form>
      )}
    </>
  );
}
