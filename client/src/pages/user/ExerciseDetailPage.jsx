// Trang exercise detail hien thi va xu ly luong nguoi dung.
import { Heart } from "lucide-react";
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
      <PageHeader
        title={exercise?.name || "Exercise"}
        actions={
          isAuthenticated ? (
            <button className="btn-primary" type="button" onClick={favorite}>
              <Heart size={17} /> Favorite
            </button>
          ) : null
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="panel overflow-hidden p-0">
          {exercise?.gifUrl || exercise?.gif_url ? (
            <img
              className="aspect-video w-full bg-slate-100 object-contain p-4"
              src={exercise.gifUrl || exercise.gif_url}
              alt={exercise.name}
            />
          ) : (
            <div className="grid aspect-video place-items-center bg-slate-100 text-sm text-slate-500">No media</div>
          )}
          <div className="p-5">
            <h2 className="mb-4 font-semibold">Instructions</h2>
            <ol className="space-y-3 text-sm text-slate-700">
              {(exercise?.instructions || []).map((step, index) => (
                <li className="flex gap-3" key={`${step}-${index}`}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint/10 text-xs font-bold text-mint">
                    {index + 1}
                  </span>
                  <span className="leading-6">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="panel h-fit space-y-4">
          <h2 className="font-semibold">Exercise info</h2>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Body parts</div>
            <div className="flex flex-wrap gap-2">
              {(exercise?.bodyParts || exercise?.body_parts || []).map((x) => (
                <span className="tag" key={x.id || x.name || x}>
                  {x.name || x}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Equipment</div>
            <div className="flex flex-wrap gap-2">
              {(exercise?.equipments || []).map((x) => (
                <span className="tag" key={x.id || x.name || x}>
                  {x.name || x}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
