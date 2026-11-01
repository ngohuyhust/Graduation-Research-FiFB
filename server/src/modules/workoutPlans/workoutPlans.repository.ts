import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { QueryExecutor } from "../../db/database.service";
import type { WorkoutItem, WorkoutPlanPayload, WorkoutPlanUpdate } from "./workoutPlans.validation";
type Pagination = { page: number; limit: number };
type PlanRow = Record<string, unknown> & { id: string; schedule: { weekday: number; dayNumber: number }[] };

export function pageOffset({ page, limit }: Pagination) {
  return (page - 1) * limit;
}

@Injectable()
export class WorkoutPlansRepository {
  constructor(private readonly db: DatabaseService) {}

  async createPlan(client: QueryExecutor, userId: string, payload: WorkoutPlanPayload) {
    const result = await client.query<Record<string, unknown> & { id: string }>(
      "INSERT INTO workout_plans (owner_id, created_by, title, description, visibility, schedule) VALUES ($1, $1, $2, $3, $4, $5) RETURNING *",
      [userId, payload.title, payload.description || null, payload.visibility, JSON.stringify(payload.schedule || [])],
    );
    return result.rows[0];
  }

  async insertItem(client: QueryExecutor, planId: string, item: WorkoutItem) {
    await client.query<Record<string, unknown> & { id: string }>(
      `INSERT INTO workout_plan_items (workout_plan_id, exercise_id, day_number, sort_order, sets, reps, duration_seconds, rest_seconds, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        planId,
        item.exerciseId,
        item.dayNumber,
        item.sortOrder,
        item.sets || null,
        item.reps || null,
        item.durationSeconds || null,
        item.restSeconds ?? null,
        item.note || null,
      ],
    );
  }

  async getPlan(client: QueryExecutor, userId: string, id: string) {
    const plan = await client.query<PlanRow>("SELECT * FROM workout_plans WHERE id = $1 AND owner_id = $2", [
      id,
      userId,
    ]);
    if (!plan.rows[0]) return null;
    const items = await client.query<Record<string, unknown> & { id: string }>(
      `SELECT i.*, e.name AS exercise_name, e.status AS exercise_status FROM workout_plan_items i
       JOIN exercises e ON e.id = i.exercise_id
       WHERE i.workout_plan_id = $1 ORDER BY i.day_number ASC, i.sort_order ASC`,
      [id],
    );
    return { ...plan.rows[0], items: items.rows };
  }

  async list(userId: string, filters: Pagination) {
    const count = await this.db.query<{ total: number }>(
      "SELECT count(*)::int AS total FROM workout_plans WHERE owner_id = $1",
      [userId],
    );
    const result = await this.db.query<Record<string, unknown> & { id: string }>(
      "SELECT * FROM workout_plans WHERE owner_id = $1 ORDER BY created_at DESC, id ASC LIMIT $2 OFFSET $3",
      [userId, filters.limit, pageOffset(filters)],
    );
    return { rows: result.rows, total: count.rows[0].total };
  }

  async updatePlan(client: QueryExecutor, userId: string, id: string, payload: WorkoutPlanUpdate) {
    const result = await client.query<Record<string, unknown> & { id: string }>(
      "UPDATE workout_plans SET title = COALESCE($3, title), description = COALESCE($4, description), visibility = COALESCE($5, visibility), status = COALESCE($6, status), schedule = COALESCE($7::jsonb, schedule), updated_at = now() WHERE id = $1 AND owner_id = $2 RETURNING *",
      [
        id,
        userId,
        payload.title,
        payload.description,
        payload.visibility,
        payload.status,
        payload.schedule === undefined ? null : JSON.stringify(payload.schedule),
      ],
    );
    return result.rows[0] || null;
  }

  async deleteItems(client: QueryExecutor, planId: string) {
    await client.query<Record<string, unknown> & { id: string }>(
      "DELETE FROM workout_plan_items WHERE workout_plan_id = $1",
      [planId],
    );
  }

  async today(userId: string, weekday: number) {
    const result = await this.db.query(
      `SELECT p.id AS "planId", p.title, (s.entry->>'dayNumber')::int AS "dayNumber",
       COALESCE((SELECT jsonb_agg(to_jsonb(i) || jsonb_build_object('exercise_name', e.name, 'exercise_status', e.status)
         ORDER BY i.sort_order) FROM workout_plan_items i JOIN exercises e ON e.id = i.exercise_id
         WHERE i.workout_plan_id = p.id AND i.day_number = (s.entry->>'dayNumber')::int), '[]'::jsonb) AS items
       FROM workout_plans p CROSS JOIN LATERAL jsonb_array_elements(p.schedule) s(entry)
       WHERE p.owner_id = $1 AND p.status = 'active' AND (s.entry->>'weekday')::int = $2
       ORDER BY p.created_at DESC, p.id ASC`,
      [userId, weekday],
    );
    return { items: result.rows };
  }

  async archive(userId: string, id: string) {
    const result = await this.db.query<Record<string, unknown> & { id: string }>(
      "UPDATE workout_plans SET status = 'archived', updated_at = now() WHERE id = $1 AND owner_id = $2 RETURNING *",
      [id, userId],
    );
    return result.rows[0] || null;
  }
}
