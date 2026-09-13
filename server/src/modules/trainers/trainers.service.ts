import { Injectable } from "@nestjs/common";
import { TrainersRepository } from "./trainers.repository";
import type { TrainerProfilePayload, TrainerQuery } from "./trainers.validation";
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");

@Injectable()
export class TrainersService {
  constructor(private readonly repository: TrainersRepository) {}

  async listTrainers(filters: TrainerQuery) {
    const result = await this.repository.list(filters);
    return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
  }

  async getTrainer(id: string) {
    const trainer = await this.repository.findById(id);
    if (!trainer) throw new AppError(codes.NOT_FOUND, "Trainer not found", 404);
    return { trainer };
  }

  async saveOwnProfile(userId: string, payload: TrainerProfilePayload) {
    return { profile: await this.repository.upsertProfile(userId, payload) };
  }
}
