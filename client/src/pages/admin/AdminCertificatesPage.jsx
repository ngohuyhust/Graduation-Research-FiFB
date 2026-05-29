import { adminApi } from "../../api/adminApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function AdminCertificatesPage() {
  const { data, loading, error, reload } = useAsync(() => adminApi.certificates({ page: 1, limit: 50 }), []);

  async function review(id, status) {
    try {
      await adminApi.reviewCertificate(id, status === "approved" ? { status } : { status, rejectionReason: "Rejected by admin" });
      showSuccess("Certificate reviewed");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Manage Trainer Certificates" />
      <DataTable
        columns={[
          { key: "title", header: "Title" },
          { key: "issuer", header: "Issuer" },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "actions", header: "Actions", render: (row) => <div className="flex gap-2"><button className="btn-primary" type="button" onClick={() => review(row.id, "approved")}>Approve</button><button className="btn-secondary" type="button" onClick={() => review(row.id, "rejected")}>Reject</button></div> },
        ]}
        rows={asItems(data)}
      />
    </>
  );
}
