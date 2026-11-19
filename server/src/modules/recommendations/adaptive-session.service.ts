import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { QueryExecutor } from "../../db/database.service";
import { RecommendationsService } from "./recommendations.service";
import { progressionAdvice, rankCandidates, ruleVersion } from "./recommendation.rules";

export const changeSchema = z
  .object({
    slotId: z.string().uuid(),
    expectedExerciseId: z.string().uuid(),
    reason: z.enum(["equipment_busy", "at_home", "short_on_time", "disliked", "too_hard"]),
    equipmentIds: z.array(z.string().uuid()).max(100).optional(),
    remainingMinutes: z.number().int().positive().max(180).optional(),
  })
  .strict();
type Change = z.infer<typeof changeSchema>;
export const feedbackSchema = z
  .object({ difficulty: z.enum(["easy", "right", "hard"]), preference: z.enum(["liked", "disliked"]).optional() })
  .strict();
type Feedback = z.infer<typeof feedbackSchema>;
type Slot = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_status: string;
  reps: number | null;
  duration_seconds: number | null;
  target_weight_kg?: number | null;
  note?: string | null;
  replaced_exercise_ids?: string[];
  sets?: number | null;
};
type Session = { id: string; completed_at: Date | null; planned_snapshot: Slot[] | null };

@Injectable()
export class AdaptiveSessionService {
  constructor(private rec: RecommendationsService) {}

  private async session(db: QueryExecutor, user: string, id: string) {
    const s = (
      await db.query<Session>(
        "SELECT id,completed_at,planned_snapshot FROM workout_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE",
        [id, user],
      )
    ).rows[0];
    if (!s) throw new NotFoundException("Workout session not found");
    const counts = (
      await db.query<{ exercise_id: string; sets: number }>(
        "SELECT exercise_id,count(*)::int AS sets FROM session_exercise_logs WHERE session_id=$1 AND deleted_at IS NULL GROUP BY exercise_id ORDER BY exercise_id",
        [id],
      )
    ).rows;
    return {
      slots: s.planned_snapshot ?? [],
      completed: !!s.completed_at,
      logged: counts.map((x) => x.exercise_id),
      counts,
    };
  }

  private async replacement(db: QueryExecutor, user: string, id: string, request: Change) {
    const { slots, completed, logged, counts } = await this.session(db, user, id);
    const slot = slots.find((x) => x.id === request.slotId);
    if (!slot || slot.exercise_id !== request.expectedExerciseId || completed)
      throw new ConflictException("This workout changed. Refresh the session.");
    const { profile, candidates } = await this.rec.inputs(db, user);
    const current = candidates.find((x) => x.id === slot.exercise_id);
    const input = { id, request, slot, slots, counts, profile, candidates };
    if (slots.filter((s) => s.exercise_id === slot.exercise_id).length !== 1)
      return { input, result: { problem: "Choose an exercise that occurs only once in this session." } };
    if (logged.includes(slot.exercise_id))
      return { input, result: { problem: "This exercise already has a logged set." } };
    if (!profile || !current)
      return { input, result: { problem: "A training profile and a classified exercise are required." } };
    const used = new Set([...slots.map((x) => x.exercise_id), ...logged]);
    const available = { ...profile, equipmentIds: request.equipmentIds ?? profile.equipmentIds };
    let budget = request.remainingMinutes ?? profile.sessionMinutes;
    for (const other of slots.filter((s) => s.id !== slot.id)) {
      const remainingSets = Math.max(
        0,
        (other.sets ?? 2) - (counts.find((x) => x.exercise_id === other.exercise_id)?.sets ?? 0),
      );
      if (remainingSets > 0) {
        const estimate = candidates.find((c) => c.id === other.exercise_id)?.minutes;
        if (!estimate) return { input, result: { problem: "The duration of another unfinished exercise is unknown." } };
        budget -= Math.ceil((estimate * remainingSets) / 2);
      }
    }
    const ranked = rankCandidates(available, candidates);
    const chosen = ranked.find(
      ({ candidate: c, exclusion }) =>
        !exclusion &&
        !used.has(c.id) &&
        (c.group === current.group || c.pattern === current.pattern) &&
        c.minutes <= budget &&
        (request.reason !== "too_hard" || c.difficulty < current.difficulty),
    );
    if (!chosen)
      return {
        input,
        result: { problem: "No replacement fits the movement, difficulty, equipment and time available." },
      };
    const c = chosen.candidate;
    return {
      input,
      result: {
        replacement: {
          ...slot,
          exercise_id: c.id,
          replaced_exercise_ids: [...new Set([...(slot.replaced_exercise_ids ?? []), slot.exercise_id])],
          exercise_name: c.name,
          exercise_status: "active",
          sets: 2,
          rest_seconds: 60,
          reps: c.type === "strength" ? 8 : null,
          duration_seconds: c.type === "timed" ? 30 : null,
          target_weight_kg: null,
          note: null,
        },
        reason: chosen.reason,
        minutes: c.minutes,
      },
    };
  }

  async substitution(user: string, id: string, body: Change) {
    return this.rec.db.withTransaction(async (db) => {
      const { input, result } = await this.replacement(db, user, id, body);
      return { runId: await this.rec.saveRun(db, user, "substitution", input, result), ...result };
    });
  }

  async feedback(user: string, id: string, exercise: string, body: Feedback) {
    return this.rec.db.withTransaction(async (db) => {
      const { completed, logged } = await this.session(db, user, id);
      await db.query("SELECT id FROM app_users WHERE id=$1 FOR UPDATE", [user]);
      if (!completed || !logged.includes(exercise))
        throw new ConflictException("Feedback requires a logged exercise in a finished workout.");
      await db.query(
        `INSERT INTO recommendation_feedback(user_id,session_id,exercise_id,difficulty,preference)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(session_id,exercise_id) DO UPDATE SET difficulty=excluded.difficulty,
        preference=coalesce(excluded.preference,recommendation_feedback.preference),updated_at=now()`,
        [user, id, exercise, body.difficulty, body.preference],
      );
      if (body.preference)
        await db.query(
          `INSERT INTO user_exercise_preferences(user_id,exercise_id,preference)
        VALUES($1,$2,$3) ON CONFLICT(user_id,exercise_id) DO UPDATE SET preference=excluded.preference`,
          [user, exercise, body.preference],
        );
      return { saved: true };
    });
  }

  private async target(db: QueryExecutor, user: string, id: string, exercise: string) {
    const { slots, completed, logged } = await this.session(db, user, id);
    const matches = slots.filter((x) => x.exercise_id === exercise);
    if (completed || matches.length !== 1 || logged.includes(exercise))
      throw new ConflictException("Select one unlogged exercise in an active workout.");
    const slot = matches[0];
    const history = (
      await db.query<{ reps: number[]; weights: number[]; rating: Feedback["difficulty"] | null }>(
        `
      SELECT array_agg(l.actual_reps ORDER BY l.set_number,l.id) AS reps,array_agg(DISTINCT l.actual_weight_kg::float8) AS weights,
        f.difficulty AS rating FROM workout_sessions s JOIN session_exercise_logs l ON l.session_id=s.id
        LEFT JOIN recommendation_feedback f ON f.session_id=s.id AND f.exercise_id=l.exercise_id
      WHERE s.user_id=$1 AND s.completed_at <= (SELECT started_at FROM workout_sessions WHERE id=$2)
        AND l.exercise_id=$3 AND l.deleted_at IS NULL GROUP BY s.id,f.difficulty ORDER BY s.completed_at DESC,s.id LIMIT 2`,
        [user, id, exercise],
      )
    ).rows;
    const input = { id, exercise, slot, history };
    const latest = history[0];
    const advice =
      slot.reps && latest?.reps.every((n) => Number.isInteger(n) && n > 0)
        ? progressionAdvice(history, latest.rating)
        : null;
    if (!advice) return { input, result: { problem: "No comparable rep-based workout history yet." } };
    const weight = latest.weights.length === 1 && latest.weights[0] > 0 ? latest.weights[0] : null;
    const reps = Math.min(...latest.reps);
    const target = {
      reps: advice.action === "increase_reps" ? Math.min(12, reps + 1) : 8,
      target_weight_kg:
        weight === null ? null : advice.action === "increase_load" ? Math.round(weight * 1.025 * 100) / 100 : weight,
    };
    return { input, result: { ...advice, target } };
  }

  async suggestion(user: string, id: string, exercise: string) {
    return this.rec.db.withTransaction(async (db) => {
      const { input, result } = await this.target(db, user, id, exercise);
      return { runId: await this.rec.saveRun(db, user, "progression", input, result), ...result };
    });
  }

  async accept(user: string, id: string, runId: string, exercise?: string) {
    return this.rec.db.withTransaction(async (db) => {
      const run = await this.rec.run(db, user, runId, exercise ? "progression" : "substitution");
      if (run.input.id !== id || (exercise && run.input.exercise !== exercise))
        throw new NotFoundException("Recommendation not found");
      if (run.decision === "accepted")
        return { applied: true, planned_exercises: (await this.session(db, user, id)).slots };
      if (run.decision !== "pending" || run.rule_version !== ruleVersion)
        throw new ConflictException("Request a new preview.");
      const current = exercise
        ? await this.target(db, user, id, exercise)
        : await this.replacement(db, user, id, run.input.request);
      if (
        current.result.problem ||
        !isDeepStrictEqual(current.input.slot, run.input.slot) ||
        !isDeepStrictEqual(current.result, run.result)
      )
        throw new ConflictException("The recommendation changed. Request a new preview.");
      const slot = run.result.replacement ?? { ...current.input.slot, ...run.result.target };
      const { slots } = await this.session(db, user, id);
      const snapshot = slots.map((s) => (s.id === slot.id ? slot : s));
      await db.query("UPDATE workout_sessions SET planned_snapshot=$2 WHERE id=$1", [id, JSON.stringify(snapshot)]);
      await db.query("UPDATE recommendation_runs SET decision='accepted' WHERE id=$1", [runId]);
      return { applied: true, planned_exercises: snapshot };
    });
  }
}
