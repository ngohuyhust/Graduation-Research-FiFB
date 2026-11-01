import { Injectable, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
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
    const result = await this.db.query<Record<string, unknown>>(
      "SELECT id, title FROM workout_plans WHERE id = $1 AND owner_id = $2",
      [planId, userId],
    );
    return result.rows[0] || null;
  }

  async create(userId: string, payload: CreateSession) {
    return this.db.withTransaction(async (db) => {
      if (payload.clientOperationId) {
        await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
          `${userId}:${payload.clientOperationId}`,
        ]);
        const existing = await db.query(
          `SELECT *, creation_request = $3::jsonb AS same_request
          FROM workout_sessions WHERE user_id = $1 AND client_operation_id = $2`,
          [userId, payload.clientOperationId, JSON.stringify(payload)],
        );
        if (existing.rows[0]) {
          if (!existing.rows[0].same_request)
            throw new ConflictException("Operation ID was already used for a different session");
          return existing.rows[0];
        }
      }
      let snapshot: unknown[] = [];
      if (payload.workoutPlanId) {
        const plan = await db.query(
          "SELECT id FROM workout_plans WHERE id = $1 AND owner_id = $2 AND status = 'active' FOR SHARE",
          [payload.workoutPlanId, userId],
        );
        if (!plan.rows[0]) throw new NotFoundException("Active workout plan not found");
        snapshot = (
          await db.query(
            `SELECT i.*, e.name AS exercise_name, e.status AS exercise_status
          FROM workout_plan_items i JOIN exercises e ON e.id = i.exercise_id
          WHERE i.workout_plan_id = $1 AND ($2::int IS NULL OR i.day_number = $2)
          ORDER BY i.day_number, i.sort_order`,
            [payload.workoutPlanId, payload.dayNumber ?? null],
          )
        ).rows;
        if (payload.dayNumber && !snapshot.length) throw new BadRequestException("Workout day has no exercises");
      }
      const result = await db.query(
        `INSERT INTO workout_sessions
        (user_id, workout_plan_id, title, notes, client_operation_id, creation_request, planned_snapshot)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          userId,
          payload.workoutPlanId || null,
          payload.title,
          payload.notes || null,
          payload.clientOperationId ?? null,
          JSON.stringify(payload),
          JSON.stringify(snapshot),
        ],
      );
      return result.rows[0];
    });
  }

  async list(userId: string, filters: Pagination) {
    const count = await this.db.query<{ total: number }>(
      "SELECT count(*)::int AS total FROM workout_sessions WHERE user_id = $1",
      [userId],
    );
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT ws.*, count(sel.id)::int AS logged_sets
       FROM workout_sessions ws
       LEFT JOIN session_exercise_logs sel ON sel.session_id = ws.id AND sel.deleted_at IS NULL
       WHERE ws.user_id = $1
       GROUP BY ws.id
       ORDER BY ws.started_at DESC, ws.id DESC
       LIMIT $2 OFFSET $3`,
      [userId, filters.limit, offset(filters)],
    );
    return { rows: result.rows, total: count.rows[0].total };
  }

  async detail(userId: string, id: string) {
    const session = await this.db.query<Record<string, unknown>>(
      "SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    if (!session.rows[0]) return null;
    const [logs, plannedExercises] = await Promise.all([
      this.db.query<Record<string, unknown>>(
        `SELECT sel.*, e.name AS exercise_name
         FROM session_exercise_logs sel
         JOIN exercises e ON e.id = sel.exercise_id
         WHERE sel.session_id = $1 AND sel.deleted_at IS NULL
         ORDER BY sel.created_at ASC, sel.set_number ASC`,
        [id],
      ),
      session.rows[0].planned_snapshot != null
        ? Promise.resolve({ rows: session.rows[0].planned_snapshot as Record<string, unknown>[] })
        : session.rows[0].workout_plan_id
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
       SET title = CASE WHEN completed_at IS NULL THEN COALESCE($3, title) ELSE title END,
           notes = CASE WHEN completed_at IS NULL AND $4::boolean THEN $5 ELSE notes END,
           completed_at = CASE WHEN $6::boolean THEN COALESCE(completed_at, now()) ELSE completed_at END
           , paused = CASE WHEN $6::boolean THEN false ELSE COALESCE($7, paused) END
           , rest_ends_at = CASE WHEN $6::boolean THEN NULL WHEN $8::boolean THEN $9::timestamptz ELSE rest_ends_at END
       WHERE id = $1 AND user_id = $2 AND (completed_at IS NULL OR $6::boolean)
       RETURNING *`,
      [
        id,
        userId,
        payload.title,
        Object.prototype.hasOwnProperty.call(payload, "notes"),
        payload.notes,
        payload.completed === true,
        payload.paused,
        Object.prototype.hasOwnProperty.call(payload, "restEndsAt"),
        payload.restEndsAt,
      ],
    );
    return result.rows[0] || null;
  }

  async ensureActiveExercise(exerciseId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      "SELECT 1 FROM exercises WHERE id = $1 AND status = 'active'",
      [exerciseId],
    );
    return Boolean(result.rows[0]);
  }

  async addLog(userId: string, sessionId: string, payload: ExerciseLog) {
    return this.db.withTransaction(async (db) => {
      const session = (
        await db.query("SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2 FOR UPDATE", [sessionId, userId])
      ).rows[0];
      if (!session) return null;
      if (payload.clientOperationId) {
        const old = (
          await db.query(
            `SELECT *, creation_request = $3::jsonb AS same_request FROM session_exercise_logs
          WHERE session_id = $1 AND client_operation_id = $2`,
            [sessionId, payload.clientOperationId, JSON.stringify(payload)],
          )
        ).rows[0];
        if (old) {
          if (!old.same_request) throw new ConflictException("Operation ID was already used for a different set");
          return old;
        }
      }
      if (session.completed_at) return null;
      const active = await db.query("SELECT id FROM exercises WHERE id = $1 AND status = 'active'", [
        payload.exerciseId,
      ]);
      if (!active.rows[0]) throw new BadRequestException("Exercise must be active");
      const result = await db.query(
        `INSERT INTO session_exercise_logs
        (session_id, exercise_id, set_number, actual_reps, actual_weight_kg, duration_seconds, note, client_operation_id, creation_request)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          sessionId,
          payload.exerciseId,
          payload.setNumber,
          payload.actualReps ?? null,
          payload.actualWeightKg ?? null,
          payload.durationSeconds ?? null,
          payload.note || null,
          payload.clientOperationId ?? null,
          JSON.stringify(payload),
        ],
      );
      if (payload.restEndsAt !== undefined)
        await db.query("UPDATE workout_sessions SET rest_ends_at = $2 WHERE id = $1", [sessionId, payload.restEndsAt]);
      return result.rows[0];
    });
  }

  async changeLog(userId: string, sessionId: string, logId: string, payload?: ExerciseLog) {
    return this.db.withTransaction(async (db) => {
      const session = (
        await db.query(
          "SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2 AND completed_at IS NULL FOR UPDATE",
          [sessionId, userId],
        )
      ).rows[0];
      if (!session) return null;
      if (!payload) {
        await db.query(
          "UPDATE session_exercise_logs SET deleted_at = COALESCE(deleted_at, now()) WHERE id = $1 AND session_id = $2",
          [logId, sessionId],
        );
        return { deleted: true };
      }
      const result = await db.query(
        `UPDATE session_exercise_logs SET set_number = $3, actual_reps = $4,
        actual_weight_kg = $5, duration_seconds = $6, note = $7
        WHERE id = $1 AND session_id = $2 AND exercise_id = $8 AND deleted_at IS NULL RETURNING *`,
        [
          logId,
          sessionId,
          payload.setNumber,
          payload.actualReps ?? null,
          payload.actualWeightKg ?? null,
          payload.durationSeconds ?? null,
          payload.note || null,
          payload.exerciseId,
        ],
      );
      return result.rows[0] || null;
    });
  }

  async previous(userId: string, exerciseId: string, sessionId: string) {
    const result = await this.db.query(
      `SELECT l.*, s.completed_at FROM session_exercise_logs l
      JOIN workout_sessions s ON s.id = l.session_id
      WHERE l.deleted_at IS NULL AND l.exercise_id = $2 AND s.id = (
        SELECT s2.id FROM workout_sessions s2 JOIN session_exercise_logs l2 ON l2.session_id = s2.id
        WHERE s2.user_id = $1 AND s2.completed_at IS NOT NULL AND s2.id <> $3
        AND s2.completed_at <= (SELECT started_at FROM workout_sessions WHERE id = $3 AND user_id = $1)
        AND l2.exercise_id = $2 AND l2.deleted_at IS NULL
        ORDER BY s2.completed_at DESC, s2.id DESC LIMIT 1)
      ORDER BY l.set_number, l.created_at`,
      [userId, exerciseId, sessionId],
    );
    return { items: result.rows };
  }

  async stats(userId: string) {
    const [summary, weekly, topExercises, dates] = await Promise.all([
      this.db.query<Record<string, unknown>>(
        `SELECT
           count(DISTINCT ws.id)::int AS total_sessions,
           count(DISTINCT ws.id) FILTER (WHERE ws.started_at >= date_trunc('week', now()))::int AS this_week_sessions,
           COALESCE(sum(sel.actual_weight_kg * sel.actual_reps), 0)::float AS total_volume_kg
         FROM workout_sessions ws
         LEFT JOIN session_exercise_logs sel ON sel.session_id = ws.id AND sel.deleted_at IS NULL
         WHERE ws.user_id = $1 AND ws.completed_at IS NOT NULL`,
        [userId],
      ),
      this.db.query<Record<string, unknown>>(
        `SELECT to_char(date_trunc('week', ws.started_at), 'IYYY-"W"IW') AS week,
                COALESCE(sum(sel.actual_weight_kg * sel.actual_reps), 0)::float AS volume_kg,
                count(DISTINCT ws.id)::int AS sessions
         FROM workout_sessions ws
         LEFT JOIN session_exercise_logs sel ON sel.session_id = ws.id AND sel.deleted_at IS NULL
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
         WHERE ws.user_id = $1 AND sel.deleted_at IS NULL
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
    const exercise = await this.db.query<{ id: string; name: string }>("SELECT id, name FROM exercises WHERE id = $1", [
      exerciseId,
    ]);
    if (!exercise.rows[0]) return null;
    const result = await this.db.query<{ date: string; max_weight: number; total_reps: number; total_sets: number }>(
      `SELECT ws.started_at::date AS date,
              COALESCE(max(sel.actual_weight_kg), 0)::float AS max_weight,
              COALESCE(sum(sel.actual_reps), 0)::int AS total_reps,
              count(sel.id)::int AS total_sets
       FROM session_exercise_logs sel
       JOIN workout_sessions ws ON ws.id = sel.session_id
       WHERE ws.user_id = $1 AND sel.exercise_id = $2 AND sel.deleted_at IS NULL
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
