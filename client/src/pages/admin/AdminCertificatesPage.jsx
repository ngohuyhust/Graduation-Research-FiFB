import { Award, Check, X } from "lucide-react";
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
          { key: "title", header: "Title", render: (row) => <span className="flex items-center gap-2 font-semibold text-ink"><Award className="text-amber-500" size={17} />{row.title || "-"}</span> },
          { key: "issuer", header: "Issuer" },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "actions", header: "Actions", render: (row) => <div className="flex gap-2"><button className="btn-primary" type="button" onClick={() => review(row.id, "approved")}><Check size={16} /> Approve</button><button className="btn-secondary" type="button" onClick={() => review(row.id, "rejected")}><X size={16} /> Reject</button></div> },
        ]}
        rows={asItems(data)}
      />
    </>
  );
}
