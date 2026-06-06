import { Heart } from "lucide-react";
import { favoriteApi } from "../../api/favoriteApi";
import EmptyState from "../../components/EmptyState";
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
      {asItems(data).length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {asItems(data).map((row) => (
            <article className="panel-hover" key={row.id || row.exerciseId || row.exercise_id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink">{row.name || row.exercise?.name || row.exerciseName || "-"}</h2>
                  <p className="mt-1 text-sm text-slate-500">Saved exercise</p>
                </div>
                <button className="btn-secondary px-3 text-red-500" title="Remove favorite" type="button" onClick={() => remove(row.exerciseId || row.exercise_id || row.id)}><Heart fill="currentColor" size={17} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState title="No favorite exercises" />}
    </>
  );
}
