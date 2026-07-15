// Trang trainer reviews hien thi va xu ly luong nguoi dung.
import { Star } from "lucide-react";
import { trainerApi } from "../../api/trainerApi";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function TrainerReviewsPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => trainerApi.reviews(user.id), [user.id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Trainer Reviews" />
      {asItems(data).length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {asItems(data).map((review) => (
            <article className="panel-hover" key={review.id || review.comment}>
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star fill={index < Number(review.rating || 0) ? "currentColor" : "none"} key={index} size={18} />
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{review.comment || "-"}</p>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {review.status || "review"}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No reviews yet" />
      )}
    </>
  );
}
