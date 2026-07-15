// Trang admin dashboard hien thi va xu ly luong nguoi dung.
import { Award, Dumbbell, ScrollText, Users } from "lucide-react";
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
    {
      label: "Users",
      value: data.users?.total ?? asItems(data.users).length,
      to: "/admin/users",
      icon: Users,
      gradient: "from-steel to-steel-light",
    },
    {
      label: "Exercises",
      value: data.exercises?.total ?? asItems(data.exercises).length,
      to: "/admin/exercises",
      icon: Dumbbell,
      gradient: "from-mint to-mint-light",
    },
    {
      label: "Certificates",
      value: data.certificates?.total ?? asItems(data.certificates).length,
      to: "/admin/certificates",
      icon: Award,
      gradient: "from-amber-500 to-yellow-400",
    },
    {
      label: "Audit logs",
      value: data.audits?.total ?? asItems(data.audits).length,
      to: "/admin/audit-logs",
      icon: ScrollText,
      gradient: "from-purple-500 to-fuchsia-500",
    },
  ];

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description={`Welcome back, Admin. ${new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date())}`}
      />
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card`}
              key={card.label}
              to={card.to}
            >
              <Icon
                className="absolute right-4 top-4 opacity-20 transition-transform group-hover:scale-110"
                size={54}
              />
              <div className="text-xs font-semibold uppercase tracking-wider text-white/75">{card.label}</div>
              <div className="mt-3 text-4xl font-extrabold">{card.value}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
