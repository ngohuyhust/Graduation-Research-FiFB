import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { ReviewPayload, ReviewQuery } from "./reviews.validation";
import type { ReviewRow } from "./reviews.types";

function pageOffset({ page, limit }: { page: number; limit: number }) {
  return (page - 1) * limit;
}

@Injectable()
export class ReviewsRepository {
  constructor(private readonly database: DatabaseService) {}

  async hasConnection(userId: string, trainerId: string) {
    const result = await this.database.query<Record<string, number>>(
      "SELECT 1 FROM user_trainer_connections WHERE user_id = $1 AND trainer_id = $2 AND status = 'active'",
      [userId, trainerId],
    );
    return Boolean(result.rows[0]);
  }

  async findMine(userId: string, trainerId: string) {
    const result = await this.database.query<{ id: string }>(
      "SELECT id FROM trainer_reviews WHERE user_id = $1 AND trainer_id = $2",
      [userId, trainerId],
    );
    return result.rows[0] || null;
  }

  async updateMine(userId: string, trainerId: string, payload: ReviewPayload) {
    const result = await this.database.query<ReviewRow>(
      "UPDATE trainer_reviews SET rating = $3, comment = $4, updated_at = now() WHERE user_id = $1 AND trainer_id = $2 RETURNING *",
      [userId, trainerId, payload.rating, payload.comment || null],
    );
    return result.rows[0];
  }

  async createMine(userId: string, trainerId: string, payload: ReviewPayload) {
    const result = await this.database.query<ReviewRow>(
      "INSERT INTO trainer_reviews (user_id, trainer_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, trainerId, payload.rating, payload.comment || null],
    );
    return result.rows[0];
  }

  async listTrainerReviews(trainerId: string, filters: ReviewQuery) {
    const count = await this.database.query<{ total: number }>(
      "SELECT count(*)::int AS total FROM trainer_reviews WHERE trainer_id = $1 AND status = 'visible'",
      [trainerId],
    );
    const result = await this.database.query<ReviewRow>(
      "SELECT * FROM trainer_reviews WHERE trainer_id = $1 AND status = 'visible' ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [trainerId, filters.limit, pageOffset(filters)],
    );
    return { rows: result.rows, total: count.rows[0].total };
  }
}
