import { Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { trainerApi } from "../../api/trainerApi";
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
      <div className="grid gap-4 md:grid-cols-2">
        {asItems(data).map((row) => (
          <article className="panel-hover" key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ink">{row.userName || row.user_id || row.userId || "-"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {row.goalSnapshot || row.goal_snapshot || "No goal snapshot provided."}
                </p>
              </div>
              <StatusBadge value={row.status} />
            </div>
            {row.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <button className="btn-primary" type="button" onClick={() => approve(row.id)}>
                  <Check size={16} /> Approve
                </button>
                <button className="btn-secondary" type="button" onClick={() => rejectForm.setValue("id", row.id)}>
                  <X size={16} /> Reject
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {rejectForm.watch("id") && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form
            className="w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 shadow-2xl"
            onSubmit={rejectForm.handleSubmit(reject)}
          >
            <h2 className="font-semibold text-ink">Reject request</h2>
            <textarea
              className="input mt-4 min-h-28"
              placeholder="Reject reason"
              {...rejectForm.register("rejectReason", { required: true })}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" type="button" onClick={() => rejectForm.reset()}>
                Cancel
              </button>
              <button className="btn-danger" type="submit">
                Reject
              </button>
            </div>
          </form>
        </div>
      )}
      {!asItems(data).length && (
        <div className="panel text-center text-sm text-slate-500">No incoming connection requests.</div>
      )}
    </>
  );
}
