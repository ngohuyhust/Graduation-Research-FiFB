import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import { FavoritesRepository } from "./favorites.repository";
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
import { ExercisesRepository } from "../exercises/exercises.repository";




@Injectable()
export class FavoritesService {
  constructor(private readonly exerciseRepository: ExercisesRepository, private readonly repository: FavoritesRepository, private readonly db: DatabaseService) {}

  async addFavorite(userId: string, exerciseId: string) {
    const favorite = await this.db.withTransaction(async (client) => {
      if (!(await this.exerciseRepository.ensureActive(client, exerciseId)))
        throw new AppError(codes.BAD_REQUEST, "Exercise must be active", 400);
      const created = await this.repository.add(client, userId, exerciseId);
      return created;
    });
    return { favorite };
  }

  async removeFavorite(userId: string, exerciseId: string) {
    await this.repository.remove(userId, exerciseId);
  }

  async listFavorites(userId: string, filters: { page: number; limit: number }) {
    const result = await this.repository.list(userId, filters);
    return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
  }
}
