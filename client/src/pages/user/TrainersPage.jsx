import { ShieldCheck, UserRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { trainerApi } from "../../api/trainerApi";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
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
      {asItems(data).length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {asItems(data).map((row) => (
            <Link className="panel-hover block" key={row.id || row.trainerId || row.trainer_id} to={`/trainers/${row.id || row.trainerId || row.trainer_id}`}>
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-mint/10 text-mint"><UserRound size={26} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold text-ink">{row.fullName || row.full_name || row.email || row.trainerName || "-"}</h2>
                    {(row.isVerified ?? row.is_verified) && <ShieldCheck className="text-mint" size={17} />}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{row.specialization || "General fitness"}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{row.yearsOfExperience ?? row.years_of_experience ?? 0} years experience</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : <EmptyState title="No trainers found" />}
      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={(page) => setParams({ ...Object.fromEntries(params), page: String(page) })} />
    </>
  );
}
