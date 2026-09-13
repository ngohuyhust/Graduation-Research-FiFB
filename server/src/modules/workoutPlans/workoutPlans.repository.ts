import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { QueryExecutor } from "../../db/database.service";
import type { WorkoutItem, WorkoutPlanPayload, WorkoutPlanUpdate } from "./workoutPlans.validation";
type Pagination = { page: number; limit: number };

export function pageOffset({ page, limit }: Pagination) {
  return (page - 1) * limit;
}

@Injectable()
export class WorkoutPlansRepository {
  constructor(private readonly db: DatabaseService) {}

  async createPlan(client: QueryExecutor, userId: string, payload: WorkoutPlanPayload) {
    const result = await client.query<Record<string, unknown> & { id: string }>(
      "INSERT INTO workout_plans (owner_id, created_by, title, description, visibility) VALUES ($1, $1, $2, $3, $4) RETURNING *",
      [userId, payload.title, payload.description || null, payload.visibility],
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
    const plan = await client.query<Record<string, unknown> & { id: string }>(
      "SELECT * FROM workout_plans WHERE id = $1 AND owner_id = $2",
      [id, userId],
    );
    if (!plan.rows[0]) return null;
    const items = await client.query<Record<string, unknown> & { id: string }>(
      "SELECT * FROM workout_plan_items WHERE workout_plan_id = $1 ORDER BY day_number ASC, sort_order ASC",
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
      "SELECT * FROM workout_plans WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [userId, filters.limit, pageOffset(filters)],
    );
    return { rows: result.rows, total: count.rows[0].total };
  }

  async updatePlan(client: QueryExecutor, userId: string, id: string, payload: WorkoutPlanUpdate) {
    const result = await client.query<Record<string, unknown> & { id: string }>(
      "UPDATE workout_plans SET title = COALESCE($3, title), description = COALESCE($4, description), visibility = COALESCE($5, visibility), status = COALESCE($6, status), updated_at = now() WHERE id = $1 AND owner_id = $2 RETURNING *",
      [id, userId, payload.title, payload.description, payload.visibility, payload.status],
    );
    return result.rows[0] || null;
  }

  async deleteItems(client: QueryExecutor, planId: string) {
    await client.query<Record<string, unknown> & { id: string }>(
      "DELETE FROM workout_plan_items WHERE workout_plan_id = $1",
      [planId],
    );
  }

  async archive(userId: string, id: string) {
    const result = await this.db.query<Record<string, unknown> & { id: string }>(
      "UPDATE workout_plans SET status = 'archived', updated_at = now() WHERE id = $1 AND owner_id = $2 RETURNING *",
      [id, userId],
    );
    return result.rows[0] || null;
  }
}
