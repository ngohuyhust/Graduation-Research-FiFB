import { useParams } from "react-router-dom";
import { exerciseApi } from "../../api/exerciseApi";
import { favoriteApi } from "../../api/favoriteApi";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAuth } from "../../contexts/AuthContext";
import { useAsync } from "../../hooks/useAsync";

export default function ExerciseDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { data, loading, error, reload } = useAsync(() => exerciseApi.detail(id), [id]);
  const exercise = data?.exercise || data;

  async function favorite() {
    try {
      await favoriteApi.add(id);
      showSuccess("Exercise added to favorites");
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title={exercise?.name || "Exercise"} actions={isAuthenticated ? <button className="btn-primary" type="button" onClick={favorite}>Favorite</button> : null} />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="panel">
          {exercise?.gifUrl || exercise?.gif_url ? <img className="aspect-square w-full rounded-md object-contain" src={exercise.gifUrl || exercise.gif_url} alt={exercise.name} /> : <div className="grid aspect-square place-items-center rounded-md bg-slate-100 text-sm text-slate-500">No media</div>}
        </div>
        <div className="panel">
          <h2 className="mb-3 font-semibold">Instructions</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
            {(exercise?.instructions || []).map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}
          </ol>
        </div>
      </div>
    </>
  );
}
