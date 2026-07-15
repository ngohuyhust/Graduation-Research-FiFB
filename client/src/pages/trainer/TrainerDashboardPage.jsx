// Trang trainer dashboard hien thi va xu ly luong nguoi dung.
import { Award, Inbox, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { trainerApi } from "../../api/trainerApi";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function TrainerDashboardPage() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [requests, certificates, connections] = await Promise.all([
      trainerApi.incomingRequests(),
      trainerApi.myCertificates(),
      trainerApi.myConnections(),
    ]);
    return { requests, certificates, connections };
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const cards = [
    {
      label: "Incoming requests",
      value: asItems(data.requests).length,
      to: "/trainer/requests",
      icon: Inbox,
      gradient: "from-mint to-mint-light",
    },
    {
      label: "Certificates",
      value: asItems(data.certificates).length,
      to: "/trainer/certificates",
      icon: Award,
      gradient: "from-steel to-steel-light",
    },
    {
      label: "Connections",
      value: asItems(data.connections).length,
      to: "/trainer/requests",
      icon: Link2,
      gradient: "from-amber-500 to-yellow-400",
    },
  ];

  return (
    <>
      <PageHeader
        title="Trainer Dashboard"
        description="Review incoming requests, keep credentials current, and track active connections."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card`}
            key={card.label}
            to={card.to}
          >
            <card.icon
              className="absolute right-4 top-4 opacity-20 transition-transform group-hover:scale-110"
              size={54}
            />
            <div className="text-xs font-semibold uppercase tracking-wider text-white/75">{card.label}</div>
            <div className="mt-3 text-4xl font-extrabold">{card.value}</div>
          </Link>
        ))}
      </div>
      <section className="panel mt-6">
        <h2 className="font-semibold text-ink">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="btn-secondary" to="/trainer/exercises">
            Submit exercise
          </Link>
          <Link className="btn-secondary" to="/trainer/certificates">
            Add certificate
          </Link>
          <Link className="btn-secondary" to="/trainer/profile">
            Update profile
          </Link>
        </div>
      </section>
    </>
  );
}
