// Trang connections hien thi va xu ly luong nguoi dung.
import { Link2, MessageCircle, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { trainerApi } from "../../api/trainerApi";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function ConnectionsPage() {
  const location = useLocation();
  const chatBasePath = location.pathname.startsWith("/trainer") ? "/trainer/chat" : "/chat";
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
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold text-ink">Requests</h2>
          <div className="space-y-3">
            {asItems(data.requests).length ? (
              asItems(data.requests).map((row) => (
                <article className="panel flex items-center justify-between gap-3" key={row.id}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-steel/10 text-steel">
                      <Link2 size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-ink">
                        {row.trainerName || row.trainer_id || row.trainerId || "-"}
                      </div>
                      <StatusBadge value={row.status} />
                    </div>
                  </div>
                  {row.status === "pending" && (
                    <button className="btn-secondary px-3" type="button" onClick={() => cancel(row.id)}>
                      <X size={16} />
                    </button>
                  )}
                </article>
              ))
            ) : (
              <EmptyState title="No requests" />
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-semibold text-ink">Connections</h2>
          <div className="space-y-3">
            {asItems(data.connections).length ? (
              asItems(data.connections).map((row) => (
                <article
                  className="panel flex items-center justify-between gap-3"
                  key={row.id || row.trainerId || row.trainer_id}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint/10 text-mint">
                      <Link2 size={18} />
                    </div>
                    <div className="font-semibold text-ink">
                      {row.trainerName || row.trainer_id || row.trainerId || "-"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={row.status} />
                    {row.status === "active" && (
                      <Link className="btn-secondary relative px-3" to={`${chatBasePath}/${row.id}`}>
                        <MessageCircle size={16} />
                        Chat
                        {Number(row.unreadCount || row.unread_count) > 0 && (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                            {row.unreadCount || row.unread_count}
                          </span>
                        )}
                      </Link>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="No connections" />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
