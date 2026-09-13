import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { QueryExecutor } from "../../db/database.service";
type Pagination = { page: number; limit: number };
const { exerciseLibrarySelect, camelExercise } = require("../exercises/exercises.repository");


export function pageOffset({ page, limit }: Pagination) {
  return (page - 1) * limit;
}

@Injectable()
export class FavoritesRepository {
  constructor(private readonly db: DatabaseService) {}

  async add(client: QueryExecutor, userId: string, exerciseId: string) {
    const result = await client.query<{ user_id: string; exercise_id: string }>(
      `INSERT INTO favorite_exercises (user_id, exercise_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, exercise_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [userId, exerciseId],
    );
    return result.rows[0] || null;
  }

  async remove(userId: string, exerciseId: string) {
    await this.db.query("DELETE FROM favorite_exercises WHERE user_id = $1 AND exercise_id = $2", [userId, exerciseId]);
  }

  async list(userId: string, filters: Pagination) {
    const count = await this.db.query<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM favorite_exercises f
       JOIN exercises e ON e.id = f.exercise_id
       WHERE f.user_id = $1 AND e.status = 'active'`,
      [userId],
    );
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT ${exerciseLibrarySelect("e")}
       FROM favorite_exercises f
       JOIN exercises e ON e.id = f.exercise_id
       WHERE f.user_id = $1 AND e.status = 'active'
       ORDER BY f.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, filters.limit, pageOffset(filters)],
    );
    return { rows: result.rows.map(camelExercise), total: count.rows[0].total };
  }
}
