import { Archive, Eye, Play, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { workoutPlanApi } from "../../api/workoutPlanApi";
import ConfirmDialog from "../../components/ConfirmDialog";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";
import { useState } from "react";

export default function WorkoutPlansPage() {
  const [archiveId, setArchiveId] = useState(null);
  const { data, loading, error, reload } = useAsync(workoutPlanApi.list, []);

  async function archive() {
    try {
      await workoutPlanApi.archive(archiveId);
      showSuccess("Workout plan archived");
      setArchiveId(null);
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Workout Plans"
        actions={
          <Link className="btn-primary" to="/workout-plans/new">
            <Plus size={17} /> New plan
          </Link>
        }
      />
      {asItems(data).length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {asItems(data).map((row) => (
            <article className="panel-hover" key={row.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link className="text-lg font-semibold text-ink hover:text-mint" to={`/workout-plans/${row.id}`}>
                    {row.title}
                  </Link>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Eye size={15} /> {row.visibility || "private"}
                  </div>
                </div>
                <StatusBadge value={row.status} />
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {(row.items || []).length} items
                </span>
                <div className="flex gap-2">
                  {row.status === "active" && (
                    <Link
                      className="btn-primary px-3"
                      to={`/workout-sessions?planId=${row.id}&title=${encodeURIComponent(row.title)}`}
                    >
                      <Play size={16} />
                      Start
                    </Link>
                  )}
                  <button className="btn-secondary px-3" type="button" onClick={() => setArchiveId(row.id)}>
                    <Archive size={16} /> Archive
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No workout plans" />
      )}
      <ConfirmDialog
        danger
        open={Boolean(archiveId)}
        title="Archive workout plan"
        message="This will archive the plan through the backend API."
        onCancel={() => setArchiveId(null)}
        onConfirm={archive}
        confirmLabel="Archive"
      />
    </>
  );
}
