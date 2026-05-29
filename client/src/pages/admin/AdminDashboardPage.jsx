import { Link } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [users, exercises, certificates, audits] = await Promise.all([
      adminApi.users({ page: 1, limit: 5 }),
      adminApi.exercises({ page: 1, limit: 5 }),
      adminApi.certificates({ page: 1, limit: 5 }),
      adminApi.auditLogs({ page: 1, limit: 5 }),
    ]);
    return { users, exercises, certificates, audits };
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const cards = [
    { label: "Users", value: data.users?.total ?? asItems(data.users).length, to: "/admin/users" },
    { label: "Exercises", value: data.exercises?.total ?? asItems(data.exercises).length, to: "/admin/exercises" },
    { label: "Certificates", value: data.certificates?.total ?? asItems(data.certificates).length, to: "/admin/certificates" },
    { label: "Audit logs", value: data.audits?.total ?? asItems(data.audits).length, to: "/admin/audit-logs" },
  ];

  return (
    <>
      <PageHeader title="Admin Dashboard" />
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => <Link className="panel block" key={card.label} to={card.to}><div className="text-sm text-slate-500">{card.label}</div><div className="mt-2 text-3xl font-bold">{card.value}</div></Link>)}
      </div>
    </>
  );
}
