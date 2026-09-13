import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { QueryExecutor } from "../../db/database.service";
import type { WorkoutItem, WorkoutPlanPayload, WorkoutPlanUpdate } from "./workoutPlans.validation";
type Pagination = { page: number; limit: number };
import { WorkoutPlansRepository } from "./workoutPlans.repository";
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
import { ExercisesRepository } from "../exercises/exercises.repository";


export function assertUniqueWorkoutOrder(items: WorkoutItem[] = []) {
  const seen = new Set();
  for (const item of items) {
    const key = `${item.dayNumber}:${item.sortOrder}`;
    if (seen.has(key))
      throw new AppError(codes.CONFLICT, "Workout plan item order must be unique per day", 409, {
        dayNumber: item.dayNumber,
        sortOrder: item.sortOrder,
      });
    seen.add(key);
  }
}

@Injectable()
export class WorkoutPlansService {
  constructor(private readonly exerciseRepository: ExercisesRepository, private readonly repository: WorkoutPlansRepository, private readonly db: DatabaseService) {}

  async insertItems(client: QueryExecutor, planId: string, items: WorkoutItem[] = []) {
    for (const item of items) {
      if (!(await this.exerciseRepository.ensureActive(client, item.exerciseId)))
        throw new AppError(codes.BAD_REQUEST, "Exercise must be active", 400);
      await this.repository.insertItem(client, planId, item);
    }
  }

  async create(userId: string, payload: WorkoutPlanPayload) {
    const plan = await this.db.withTransaction(async (client) => {
      assertUniqueWorkoutOrder(payload.items);
      const created = await this.repository.createPlan(client, userId, payload);
      await this.insertItems(client, created.id, payload.items);
      return this.repository.getPlan(client, userId, created.id);
    });
    return { plan };
  }

  async detail(userId: string, id: string) {
    const plan = await this.repository.getPlan(this.db, userId, id);
    if (!plan) throw new AppError(codes.NOT_FOUND, "Workout plan not found", 404);
    return { plan };
  }

  async list(userId: string, filters: Pagination) {
    const result = await this.repository.list(userId, filters);
    return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
  }

  async update(userId: string, id: string, payload: WorkoutPlanUpdate) {
    const plan = await this.db.withTransaction(async (client) => {
      const updated = await this.repository.updatePlan(client, userId, id, payload);
      if (!updated) throw new AppError(codes.NOT_FOUND, "Workout plan not found", 404);
      if (payload.items) {
        assertUniqueWorkoutOrder(payload.items);
        await this.repository.deleteItems(client, id);
        await this.insertItems(client, id, payload.items);
      }
      return this.repository.getPlan(client, userId, id);
    });
    return { plan };
  }

  async archive(userId: string, id: string) {
    const plan = await this.repository.archive(userId, id);
    if (!plan) throw new AppError(codes.NOT_FOUND, "Workout plan not found", 404);
    return { plan };
  }
}
