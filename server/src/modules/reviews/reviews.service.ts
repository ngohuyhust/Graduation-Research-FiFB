import { Injectable } from "@nestjs/common";
import { ReviewsRepository } from "./reviews.repository";
import type { ReviewPayload, ReviewQuery } from "./reviews.validation";
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");

@Injectable()
export class ReviewsService {
  constructor(private readonly repository: ReviewsRepository) {}

  async upsertReview(userId: string, trainerId: string, payload: ReviewPayload) {
    if (!(await this.repository.hasConnection(userId, trainerId)))
      throw new AppError(codes.FORBIDDEN, "Trainer review requires a valid connection", 403);
    const existing = await this.repository.findMine(userId, trainerId);
    const review = existing
      ? await this.repository.updateMine(userId, trainerId, payload)
      : await this.repository.createMine(userId, trainerId, payload);
    return { review };
  }

  async listTrainerReviews(trainerId: string, filters: ReviewQuery) {
    const result = await this.repository.listTrainerReviews(trainerId, filters);
    return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
  }
}
