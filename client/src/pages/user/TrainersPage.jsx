import { Link, useSearchParams } from "react-router-dom";
import { trainerApi } from "../../api/trainerApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { asItems, asPagination } from "../../utils/format";

export default function TrainersPage() {
  const [params, setParams] = useSearchParams({ page: "1", limit: "20" });
  const { data, loading, error, reload } = useAsync(() => trainerApi.list(Object.fromEntries(params)), [params]);
  const pagination = asPagination(data);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Trainers" description="Find active trainers and view public profiles." />
      <DataTable
        columns={[
          { key: "fullName", header: "Trainer", render: (row) => <Link className="font-semibold text-steel" to={`/trainers/${row.id || row.trainerId || row.trainer_id}`}>{row.fullName || row.full_name || row.email || row.trainerName || "-"}</Link> },
          { key: "specialization", header: "Specialization" },
          { key: "yearsOfExperience", header: "Experience", render: (row) => row.yearsOfExperience ?? row.years_of_experience ?? "-" },
          { key: "verified", header: "Verified", render: (row) => <StatusBadge value={row.isVerified ?? row.is_verified} /> },
        ]}
        rows={asItems(data)}
      />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(page) => setParams({ ...Object.fromEntries(params), page: String(page) })} />
    </>
  );
}
