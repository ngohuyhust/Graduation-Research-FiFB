import { favoriteApi } from "../../api/favoriteApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function FavoritesPage() {
  const { data, loading, error, reload } = useAsync(favoriteApi.list, []);

  async function remove(id) {
    try {
      await favoriteApi.remove(id);
      showSuccess("Favorite removed");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Favorite Exercises" />
      <DataTable
        columns={[
          { key: "name", header: "Exercise", render: (row) => row.name || row.exercise?.name || row.exerciseName || "-" },
          { key: "actions", header: "Actions", render: (row) => <button className="btn-secondary" type="button" onClick={() => remove(row.exerciseId || row.exercise_id || row.id)}>Remove</button> },
        ]}
        rows={asItems(data)}
      />
    </>
  );
}
