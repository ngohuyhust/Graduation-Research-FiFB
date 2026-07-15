// Trang admin email deliveries hien thi va xu ly luong nguoi dung.
import { Mail } from "lucide-react";
import { adminApi } from "../../api/adminApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { asItems, formatDate } from "../../utils/format";

export default function AdminEmailDeliveriesPage() {
  const { data, loading, error, reload } = useAsync(() => adminApi.emailDeliveries({ page: 1, limit: 50 }), []);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Email Delivery Logs" />
      <DataTable
        columns={[
          {
            key: "to",
            header: "To",
            render: (row) => (
              <span className="flex items-center gap-2 font-medium text-ink">
                <Mail className="text-steel" size={16} />
                {row.to || "-"}
              </span>
            ),
          },
          { key: "templateKey", header: "Template", render: (row) => row.templateKey || row.template_key || "-" },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "createdAt", header: "Created", render: (row) => formatDate(row.createdAt || row.created_at) },
        ]}
        rows={asItems(data)}
      />
    </>
  );
}
