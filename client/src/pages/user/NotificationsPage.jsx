import { CheckCheck } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems, formatDate } from "../../utils/format";

export default function NotificationsPage() {
  const { data, loading, error, reload } = useAsync(() => notificationApi.list({ page: 1, limit: 50 }), []);

  async function markAllRead() {
    try {
      await notificationApi.markAllRead();
      showSuccess("Notifications marked as read");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Notifications" actions={<button className="btn-secondary" type="button" onClick={markAllRead}><CheckCheck size={17} /> Mark all read</button>} />
      {asItems(data).length ? (
        <div className="space-y-3">
          {asItems(data).map((row) => {
            const read = row.readAt || row.read_at;
            return (
              <article className={`panel border-l-4 ${read ? "border-l-slate-200 opacity-80" : "border-l-mint"}`} key={row.id || row.title}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className={`font-semibold ${read ? "text-slate-600" : "text-ink"}`}>{row.title || "-"}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{row.content || "-"}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{formatDate(row.createdAt || row.created_at)}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : <EmptyState title="No notifications" />}
    </>
  );
}
