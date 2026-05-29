import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { trainerApi } from "../../api/trainerApi";
import ErrorState from "../../components/ErrorState";
import FormField from "../../components/FormField";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function TrainerDetailPage() {
  const { id } = useParams();
  const requestForm = useForm({ defaultValues: { goalSnapshot: "", message: "" } });
  const reviewForm = useForm({ defaultValues: { rating: 5, comment: "" } });
  const { data, loading, error, reload } = useAsync(async () => {
    const [trainer, reviews] = await Promise.all([trainerApi.detail(id), trainerApi.reviews(id)]);
    return { trainer: trainer?.trainer || trainer, reviews };
  }, [id]);

  async function sendRequest(values) {
    try {
      await trainerApi.sendRequest({ trainerId: id, ...values });
      requestForm.reset();
      showSuccess("Connection request sent");
    } catch (err) {
      showError(err);
    }
  }

  async function submitReview(values) {
    try {
      await trainerApi.reviewTrainer(id, { rating: Number(values.rating), comment: values.comment || undefined });
      reviewForm.reset({ rating: 5, comment: "" });
      showSuccess("Review submitted");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title={data.trainer?.fullName || data.trainer?.full_name || "Trainer"} description={data.trainer?.bio} />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="panel space-y-3">
          <StatusBadge value={data.trainer?.isVerified ?? data.trainer?.is_verified} />
          <p className="text-sm text-slate-600">Specialization: {data.trainer?.specialization || "-"}</p>
          <p className="text-sm text-slate-600">Experience: {data.trainer?.yearsOfExperience ?? data.trainer?.years_of_experience ?? 0} years</p>
          <h2 className="pt-4 font-semibold">Reviews</h2>
          <div className="space-y-3">
            {asItems(data.reviews).map((review) => (
              <div className="rounded-md border border-slate-200 p-3 text-sm" key={review.id}>
                <div className="font-semibold">{review.rating}/5</div>
                <p className="text-slate-600">{review.comment || "-"}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-6">
          <form className="panel space-y-4" onSubmit={requestForm.handleSubmit(sendRequest)}>
            <h2 className="font-semibold">Connection request</h2>
            <FormField label="Goal"><textarea className="input min-h-20" {...requestForm.register("goalSnapshot")} /></FormField>
            <FormField label="Message"><textarea className="input min-h-20" {...requestForm.register("message")} /></FormField>
            <button className="btn-primary" disabled={requestForm.formState.isSubmitting} type="submit">Send request</button>
          </form>
          <form className="panel space-y-4" onSubmit={reviewForm.handleSubmit(submitReview)}>
            <h2 className="font-semibold">Review trainer</h2>
            <FormField label="Rating"><input className="input" min="1" max="5" type="number" {...reviewForm.register("rating", { required: true, min: 1, max: 5 })} /></FormField>
            <FormField label="Comment"><textarea className="input min-h-20" {...reviewForm.register("comment")} /></FormField>
            <button className="btn-secondary" disabled={reviewForm.formState.isSubmitting} type="submit">Submit review</button>
          </form>
        </section>
      </div>
    </>
  );
}
