import { Lock, ShieldCheck, SlidersHorizontal, UserX } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems, asPagination } from "../../utils/format";

export default function AdminUsersPage() {
  const [params, setParams] = useSearchParams({ page: "1", limit: "20" });
  const { data, loading, error, reload } = useAsync(() => adminApi.users(Object.fromEntries(params)), [params]);
  const pagination = asPagination(data);

  async function setStatus(id, status) {
    try {
      await adminApi.updateUserStatus(id, status);
      showSuccess("User status updated");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Manage Users" />
      <div className="panel mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600"><SlidersHorizontal size={17} /> User status actions</div>
        <div className="text-xs uppercase tracking-wider text-slate-400">Showing page {pagination.page}</div>
      </div>
      <DataTable
        columns={[
          { key: "email", header: "Email" },
          { key: "fullName", header: "Name", render: (row) => row.fullName || row.full_name || "-" },
          { key: "role", header: "Role" },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "actions", header: "Actions", render: (row) => <div className="flex flex-wrap gap-2"><button className="btn-secondary px-3" title="Activate user" onClick={() => setStatus(row.id, "active")} type="button"><ShieldCheck size={16} /></button><button className="btn-secondary px-3" title="Lock user" onClick={() => setStatus(row.id, "locked")} type="button"><Lock size={16} /></button><button className="btn-danger px-3" title="Disable user" onClick={() => setStatus(row.id, "disabled")} type="button"><UserX size={16} /></button></div> },
        ]}
        rows={asItems(data)}
      />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(page) => setParams({ ...Object.fromEntries(params), page: String(page) })} />
    </>
  );
}
