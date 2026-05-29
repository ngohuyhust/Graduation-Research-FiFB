import { notificationApi } from "../../api/notificationApi";
import DataTable from "../../components/DataTable";
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
      <PageHeader title="Notifications" actions={<button className="btn-secondary" type="button" onClick={markAllRead}>Mark all read</button>} />
      <DataTable
        columns={[
          { key: "title", header: "Title" },
          { key: "content", header: "Content" },
          { key: "createdAt", header: "Created", render: (row) => formatDate(row.createdAt || row.created_at) },
          { key: "readAt", header: "Read", render: (row) => row.readAt || row.read_at ? "Read" : "Unread" },
        ]}
        rows={asItems(data)}
      />
    </>
  );
}
