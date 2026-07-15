// Trang trainer requests hien thi va xu ly luong nguoi dung.
import { CalendarClock, Check, Mail, MessageCircle, UserRound, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { trainerApi } from "../../api/trainerApi";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems, formatDate } from "../../utils/format";

function requesterName(row) {
  return row.userName || row.user_name || row.userEmail || row.user_email || "Unknown user";
}

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
      <PageHeader title="Connection Requests" description="Review student requests and continue approved connections." />
      <div className="grid gap-4 md:grid-cols-2">
        {asItems(data).map((row) => (
          <article className="panel-hover" key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-mint/10 text-mint">
                  {row.userAvatarUrl || row.user_avatar_url ? (
                    <img
                      className="h-full w-full object-cover"
                      src={row.userAvatarUrl || row.user_avatar_url}
                      alt={requesterName(row)}
                    />
                  ) : (
                    <UserRound size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-ink">{requesterName(row)}</h2>
                  {(row.userEmail || row.user_email) && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <Mail size={13} /> {row.userEmail || row.user_email}
                    </p>
                  )}
                </div>
              </div>
              <StatusBadge value={row.status} />
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="leading-6">{row.goalSnapshot || row.goal_snapshot || "No goal snapshot provided."}</p>
              {row.message && <p className="rounded-lg bg-slate-50 p-3 leading-6 text-slate-700">{row.message}</p>}
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarClock size={13} /> Sent {formatDate(row.createdAt || row.created_at)}
              </p>
              {(row.rejectionReason || row.reject_reason) && (
                <p className="text-sm text-red-600">Rejected reason: {row.rejectionReason || row.reject_reason}</p>
              )}
            </div>
            {row.status === "pending" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-primary" type="button" onClick={() => approve(row.id)}>
                  <Check size={16} /> Approve
                </button>
                <button className="btn-secondary" type="button" onClick={() => rejectForm.setValue("id", row.id)}>
                  <X size={16} /> Reject
                </button>
              </div>
            )}
            {row.status === "approved" && (row.connectionId || row.connection_id) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="btn-primary" to={`/trainer/chat/${row.connectionId || row.connection_id}`}>
                  <MessageCircle size={16} /> Chat
                </Link>
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
