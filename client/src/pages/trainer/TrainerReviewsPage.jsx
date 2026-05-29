import { trainerApi } from "../../api/trainerApi";
import DataTable from "../../components/DataTable";
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
      <DataTable columns={[{ key: "rating", header: "Rating" }, { key: "comment", header: "Comment" }, { key: "status", header: "Status" }]} rows={asItems(data)} />
    </>
  );
}
