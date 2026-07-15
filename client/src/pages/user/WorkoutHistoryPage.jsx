// Trang workout history hien thi va xu ly luong nguoi dung.
import { Activity, CalendarDays, Flame, Plus, Weight } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { workoutSessionApi } from "../../api/workoutSessionApi";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { showError } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems, formatDate } from "../../utils/format";

export default function WorkoutHistoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [starting, setStarting] = useState(false);
  const workoutPlanId = searchParams.get("planId") || undefined;
  const { data, loading, error, reload } = useAsync(async () => {
    const [sessions, stats] = await Promise.all([workoutSessionApi.list(), workoutSessionApi.stats()]);
    return { sessions, stats };
  }, []);

  async function startSession(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setStarting(true);
    try {
      const result = await workoutSessionApi.create({
        title: title.trim(),
        workoutPlanId,
      });
      const session = result?.session || result;
      navigate(`/workout-sessions/${session.id}`);
    } catch (err) {
      showError(err);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const stats = data.stats || {};

  return (
    <>
      <PageHeader title="Workout Sessions" />
      <form className="panel mb-6 flex flex-col gap-3 sm:flex-row" onSubmit={startSession}>
        <input
          className="input"
          placeholder="Session title, e.g. Push day"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button className="btn-primary shrink-0" disabled={starting || !title.trim()} type="submit">
          <Plus size={17} />
          Start workout
        </button>
      </form>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Completed", value: stats.totalSessions || 0, icon: Activity },
          { label: "This week", value: stats.thisWeekSessions || 0, icon: CalendarDays },
          { label: "Current streak", value: `${stats.currentStreak || 0} days`, icon: Flame },
          { label: "Total volume", value: `${Math.round(stats.totalVolumeKg || 0)} kg`, icon: Weight },
        ].map((item) => (
          <article className="panel" key={item.label}>
            <item.icon className="mb-3 text-mint" size={20} />
            <div className="text-2xl font-bold text-ink">{item.value}</div>
            <div className="mt-1 text-sm text-slate-500">{item.label}</div>
          </article>
        ))}
      </section>

      {asItems(data.sessions).length ? (
        <div className="space-y-3">
          {asItems(data.sessions).map((session) => (
            <button
              className="panel-hover flex w-full items-center justify-between text-left"
              key={session.id}
              type="button"
              onClick={() => navigate(`/workout-sessions/${session.id}`)}
            >
              <div>
                <h2 className="font-semibold text-ink">{session.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{formatDate(session.startedAt || session.started_at)}</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <div>{session.loggedSets || session.logged_sets || 0} logged sets</div>
                <div className={session.completedAt || session.completed_at ? "text-mint" : "text-amber-600"}>
                  {session.completedAt || session.completed_at ? "Completed" : "In progress"}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="No workout sessions" />
      )}
    </>
  );
}
