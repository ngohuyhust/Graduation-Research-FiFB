import { CheckCircle2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { workoutSessionApi } from "../../api/workoutSessionApi";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { showError, showSuccess } from "../../components/ToastBridge";

const emptyLog = { exerciseId: "", setNumber: 1, actualReps: "", actualWeightKg: "", durationSeconds: "" };

export default function WorkoutSessionPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [log, setLog] = useState(emptyLog);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await workoutSessionApi.detail(id);
      setSession(result?.session || result);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const exercises = useMemo(() => {
    const planned = session?.plannedExercises || session?.planned_exercises || [];
    const logged = session?.logs || [];
    const map = new Map();
    planned.forEach((item) =>
      map.set(item.exerciseId || item.exercise_id, {
        id: item.exerciseId || item.exercise_id,
        name: item.exerciseName || item.exercise_name,
      }),
    );
    logged.forEach((item) =>
      map.set(item.exerciseId || item.exercise_id, {
        id: item.exerciseId || item.exercise_id,
        name: item.exerciseName || item.exercise_name,
      }),
    );
    return [...map.values()];
  }, [session]);

  useEffect(() => {
    if (!log.exerciseId && exercises[0]) setLog((current) => ({ ...current, exerciseId: exercises[0].id }));
  }, [exercises, log.exerciseId]);

  async function addLog(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await workoutSessionApi.addLog(id, {
        exerciseId: log.exerciseId,
        setNumber: Number(log.setNumber),
        actualReps: log.actualReps ? Number(log.actualReps) : undefined,
        actualWeightKg: log.actualWeightKg !== "" ? Number(log.actualWeightKg) : undefined,
        durationSeconds: log.durationSeconds ? Number(log.durationSeconds) : undefined,
      });
      setLog((current) => ({ ...emptyLog, exerciseId: current.exerciseId, setNumber: Number(current.setNumber) + 1 }));
      showSuccess("Set logged");
      await load();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  }

  async function complete() {
    try {
      await workoutSessionApi.update(id, { completed: true });
      showSuccess("Workout completed");
      await load();
    } catch (err) {
      showError(err);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!session) return <LoadingState />;
  const completed = Boolean(session.completedAt || session.completed_at);

  return (
    <>
      <PageHeader
        title={session.title}
        actions={
          !completed && (
            <button className="btn-primary" type="button" onClick={complete}>
              <CheckCircle2 size={17} />
              Complete
            </button>
          )
        }
      />

      {!completed && (
        <form className="panel mb-6 grid gap-3 md:grid-cols-6" onSubmit={addLog}>
          {exercises.length ? (
            <select
              className="input md:col-span-2"
              required
              value={log.exerciseId}
              onChange={(event) => setLog({ ...log, exerciseId: event.target.value })}
            >
              <option value="">Select exercise</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input md:col-span-2"
              placeholder="Exercise UUID"
              required
              value={log.exerciseId}
              onChange={(event) => setLog({ ...log, exerciseId: event.target.value })}
            />
          )}
          <input
            className="input"
            min="1"
            placeholder="Set"
            type="number"
            value={log.setNumber}
            onChange={(event) => setLog({ ...log, setNumber: event.target.value })}
          />
          <input
            className="input"
            min="1"
            placeholder="Reps"
            type="number"
            value={log.actualReps}
            onChange={(event) => setLog({ ...log, actualReps: event.target.value })}
          />
          <input
            className="input"
            min="0"
            placeholder="Weight kg"
            step="0.25"
            type="number"
            value={log.actualWeightKg}
            onChange={(event) => setLog({ ...log, actualWeightKg: event.target.value })}
          />
          <input
            className="input"
            min="1"
            placeholder="Duration sec"
            type="number"
            value={log.durationSeconds}
            onChange={(event) => setLog({ ...log, durationSeconds: event.target.value })}
          />
          <button className="btn-primary md:col-span-6" disabled={saving || !log.exerciseId} type="submit">
            <Plus size={17} />
            Log set
          </button>
        </form>
      )}

      <section className="space-y-3">
        {(session.logs || []).map((item) => (
          <article className="panel flex items-center justify-between gap-4" key={item.id}>
            <div>
              <h2 className="font-semibold text-ink">{item.exerciseName || item.exercise_name}</h2>
              <p className="mt-1 text-sm text-slate-500">Set {item.setNumber || item.set_number}</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              {item.actualReps || item.actual_reps ? <div>{item.actualReps || item.actual_reps} reps</div> : null}
              {(item.actualWeightKg ?? item.actual_weight_kg) ? (
                <div>{item.actualWeightKg ?? item.actual_weight_kg} kg</div>
              ) : null}
              {item.durationSeconds || item.duration_seconds ? (
                <div>{item.durationSeconds || item.duration_seconds} sec</div>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
