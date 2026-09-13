import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { CreateSession, UpdateSession, ExerciseLog } from "./workoutSessions.validation";
type Pagination = { page: number; limit: number };


export function offset({ page, limit }: Pagination) {
  return (page - 1) * limit;
}

@Injectable()
export class WorkoutSessionsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findOwnedPlan(userId: string, planId: string) {
    const result = await this.db.query<Record<string, unknown>>("SELECT id, title FROM workout_plans WHERE id = $1 AND owner_id = $2", [planId, userId]);
    return result.rows[0] || null;
  }

  async create(userId: string, payload: CreateSession) {
    const result = await this.db.query<Record<string, unknown>>(
      `INSERT INTO workout_sessions (user_id, workout_plan_id, title, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, payload.workoutPlanId || null, payload.title, payload.notes || null],
    );
    return result.rows[0];
  }

  async list(userId: string, filters: Pagination) {
    const count = await this.db.query<{ total: number }>("SELECT count(*)::int AS total FROM workout_sessions WHERE user_id = $1", [userId]);
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT ws.*, count(sel.id)::int AS logged_sets
       FROM workout_sessions ws
       LEFT JOIN session_exercise_logs sel ON sel.session_id = ws.id
       WHERE ws.user_id = $1
       GROUP BY ws.id
       ORDER BY ws.started_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, filters.limit, offset(filters)],
    );
    return { rows: result.rows, total: count.rows[0].total };
  }

  async detail(userId: string, id: string) {
    const session = await this.db.query<Record<string, unknown>>("SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2", [id, userId]);
    if (!session.rows[0]) return null;
    const [logs, plannedExercises] = await Promise.all([
      this.db.query<Record<string, unknown>>(
        `SELECT sel.*, e.name AS exercise_name
         FROM session_exercise_logs sel
         JOIN exercises e ON e.id = sel.exercise_id
         WHERE sel.session_id = $1
         ORDER BY sel.created_at ASC, sel.set_number ASC`,
        [id],
      ),
      session.rows[0].workout_plan_id
        ? this.db.query<Record<string, unknown>>(
            `SELECT wpi.*, e.name AS exercise_name
             FROM workout_plan_items wpi
             JOIN exercises e ON e.id = wpi.exercise_id
             WHERE wpi.workout_plan_id = $1
             ORDER BY wpi.day_number, wpi.sort_order`,
            [session.rows[0].workout_plan_id],
          )
        : Promise.resolve({ rows: [] }),
    ]);
    return { ...session.rows[0], logs: logs.rows, planned_exercises: plannedExercises.rows };
  }

  async update(userId: string, id: string, payload: UpdateSession) {
    const result = await this.db.query<Record<string, unknown>>(
      `UPDATE workout_sessions
       SET title = COALESCE($3, title),
           notes = CASE WHEN $4::boolean THEN $5 ELSE notes END,
           completed_at = CASE WHEN $6::boolean THEN COALESCE(completed_at, now()) ELSE completed_at END
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        id,
        userId,
        payload.title,
        Object.prototype.hasOwnProperty.call(payload, "notes"),
        payload.notes,
        payload.completed === true,
      ],
    );
    return result.rows[0] || null;
  }

  async ensureActiveExercise(exerciseId: string) {
    const result = await this.db.query<Record<string, unknown>>("SELECT 1 FROM exercises WHERE id = $1 AND status = 'active'", [exerciseId]);
    return Boolean(result.rows[0]);
  }

  async addLog(userId: string, sessionId: string, payload: ExerciseLog) {
    const result = await this.db.query<Record<string, unknown>>(
      `INSERT INTO session_exercise_logs
         (session_id, exercise_id, set_number, actual_reps, actual_weight_kg, duration_seconds, note)
       SELECT ws.id, $3, $4, $5, $6, $7, $8
       FROM workout_sessions ws
       WHERE ws.id = $1 AND ws.user_id = $2 AND ws.completed_at IS NULL
       RETURNING *`,
      [
        sessionId,
        userId,
        payload.exerciseId,
        payload.setNumber,
        payload.actualReps || null,
        payload.actualWeightKg ?? null,
        payload.durationSeconds || null,
        payload.note || null,
      ],
    );
    return result.rows[0] || null;
  }

  async stats(userId: string) {
    const [summary, weekly, topExercises, dates] = await Promise.all([
      this.db.query<Record<string, unknown>>(
        `SELECT
           count(DISTINCT ws.id)::int AS total_sessions,
           count(DISTINCT ws.id) FILTER (WHERE ws.started_at >= date_trunc('week', now()))::int AS this_week_sessions,
           COALESCE(sum(sel.actual_weight_kg * sel.actual_reps), 0)::float AS total_volume_kg
         FROM workout_sessions ws
         LEFT JOIN session_exercise_logs sel ON sel.session_id = ws.id
         WHERE ws.user_id = $1 AND ws.completed_at IS NOT NULL`,
        [userId],
      ),
      this.db.query<Record<string, unknown>>(
        `SELECT to_char(date_trunc('week', ws.started_at), 'IYYY-"W"IW') AS week,
                COALESCE(sum(sel.actual_weight_kg * sel.actual_reps), 0)::float AS volume_kg,
                count(DISTINCT ws.id)::int AS sessions
         FROM workout_sessions ws
         LEFT JOIN session_exercise_logs sel ON sel.session_id = ws.id
         WHERE ws.user_id = $1 AND ws.completed_at IS NOT NULL
           AND ws.started_at >= now() - interval '12 weeks'
         GROUP BY date_trunc('week', ws.started_at)
         ORDER BY date_trunc('week', ws.started_at)`,
        [userId],
      ),
      this.db.query<Record<string, unknown>>(
        `SELECT e.id AS exercise_id, e.name,
                count(sel.id)::int AS total_sets,
                COALESCE(max(sel.actual_weight_kg), 0)::float AS max_weight
         FROM session_exercise_logs sel
         JOIN workout_sessions ws ON ws.id = sel.session_id
         JOIN exercises e ON e.id = sel.exercise_id
         WHERE ws.user_id = $1
         GROUP BY e.id, e.name
         ORDER BY total_sets DESC, e.name
         LIMIT 5`,
        [userId],
      ),
      this.db.query<{ workout_date: Date | string }>(
        `SELECT DISTINCT completed_at::date AS workout_date
         FROM workout_sessions
         WHERE user_id = $1 AND completed_at IS NOT NULL
         ORDER BY workout_date DESC`,
        [userId],
      ),
    ]);
    return { summary: summary.rows[0], weekly: weekly.rows, topExercises: topExercises.rows, dates: dates.rows };
  }

  async progression(userId: string, exerciseId: string) {
    const exercise = await this.db.query<{ id: string; name: string }>("SELECT id, name FROM exercises WHERE id = $1", [exerciseId]);
    if (!exercise.rows[0]) return null;
    const result = await this.db.query<{ date: string; max_weight: number; total_reps: number; total_sets: number }>(
      `SELECT ws.started_at::date AS date,
              COALESCE(max(sel.actual_weight_kg), 0)::float AS max_weight,
              COALESCE(sum(sel.actual_reps), 0)::int AS total_reps,
              count(sel.id)::int AS total_sets
       FROM session_exercise_logs sel
       JOIN workout_sessions ws ON ws.id = sel.session_id
       WHERE ws.user_id = $1 AND sel.exercise_id = $2
       GROUP BY ws.started_at::date
       ORDER BY date`,
      [userId, exerciseId],
    );
    const personalRecord = result.rows.reduce<{ weight: number; date: string } | null>(
      (best, row) => (row.max_weight > (best?.weight || -1) ? { weight: row.max_weight, date: row.date } : best),
      null,
    );
    return { exercise: exercise.rows[0], progression: result.rows, personalRecord };
  }
}
