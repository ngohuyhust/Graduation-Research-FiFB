import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { workoutPlanApi } from "../../api/workoutPlanApi";
import ConfirmDialog from "../../components/ConfirmDialog";
import DataTable from "../../components/DataTable";
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
      <PageHeader title="Workout Plans" actions={<Link className="btn-primary" to="/workout-plans/new"><Plus size={17} /> New plan</Link>} />
      <DataTable
        columns={[
          { key: "title", header: "Title", render: (row) => <Link className="font-semibold text-steel" to={`/workout-plans/${row.id}`}>{row.title}</Link> },
          { key: "visibility", header: "Visibility" },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "actions", header: "Actions", render: (row) => <button className="btn-secondary" type="button" onClick={() => setArchiveId(row.id)}>Archive</button> },
        ]}
        rows={asItems(data)}
      />
      <ConfirmDialog danger open={Boolean(archiveId)} title="Archive workout plan" message="This will archive the plan through the backend API." onCancel={() => setArchiveId(null)} onConfirm={archive} confirmLabel="Archive" />
    </>
  );
}
