import { Link } from "react-router-dom";
import { trainerApi } from "../../api/trainerApi";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function TrainerDashboardPage() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [requests, certificates, connections] = await Promise.all([trainerApi.incomingRequests(), trainerApi.myCertificates(), trainerApi.myConnections()]);
    return { requests, certificates, connections };
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const cards = [
    { label: "Incoming requests", value: asItems(data.requests).length, to: "/trainer/requests" },
    { label: "Certificates", value: asItems(data.certificates).length, to: "/trainer/certificates" },
    { label: "Connections", value: asItems(data.connections).length, to: "/trainer/requests" },
  ];

  return (
    <>
      <PageHeader title="Trainer Dashboard" />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link className="panel block" key={card.label} to={card.to}>
            <div className="text-sm text-slate-500">{card.label}</div>
            <div className="mt-2 text-3xl font-bold">{card.value}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
