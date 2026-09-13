import { Inject, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type { Actor } from "../../common/auth.guard";
import type { ExercisePayload, ExerciseUpdate, ExerciseQuery, ReviewDecision } from "./exercises.validation";
import type * as ExercisesRepository from "./exercises.repository";

export const EXERCISES_REPOSITORY = Symbol("EXERCISES_REPOSITORY");
const { withTransaction } = require("../../db/pool");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
import { AuditRepository } from "../audit/audit.repository";
import { NotificationsRepository } from "../notifications/notifications.repository";
const { invalidateByPrefix } = require("../../utils/cache");

export function hasMappingPayload(payload: ExerciseUpdate) {
  return (["bodyPartIds", "equipmentIds", "targetMuscleIds", "secondaryMuscleIds"] as const).some((key) =>
    Array.isArray(payload[key]),
  );
}

@Injectable()
export class ExercisesService {
  constructor(private readonly auditRepository: AuditRepository, private readonly notificationRepository: NotificationsRepository, @Inject(EXERCISES_REPOSITORY) private readonly repository: typeof ExercisesRepository) {}

  async listExercises(filters: ExerciseQuery, admin = false) {
    const result = await this.repository.list(filters, admin);
    return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
  }

  async getActiveExercise(id: string) {
    const exercise = await this.repository.findActiveById(id);
    if (!exercise) throw new AppError(codes.NOT_FOUND, "Exercise not found", 404);
    return { exercise };
  }

  async createExercise(actor: Actor, payload: ExercisePayload, source: string) {
    const exercise = await withTransaction(async (client: PoolClient) => {
      const created = await this.repository.create(client, actor, payload, source);
      await this.repository.replaceMappings(client, created.id, payload);
      return created;
    });
    await invalidateByPrefix("exercises:");
    return { exercise };
  }

  async updateExercise(actor: Actor, id: string, payload: ExerciseUpdate) {
    const exercise = await withTransaction(async (client: PoolClient) => {
      const oldExercise = await this.repository.findById(client, id);
      if (!oldExercise) throw new AppError(codes.NOT_FOUND, "Exercise not found", 404);
      const updated = await this.repository.update(client, id, payload);
      if (hasMappingPayload(payload)) await this.repository.replaceMappings(client, id, payload);
      await this.auditRepository.createAudit(client, {
        actorId: actor.userId,
        action: "exercise.update",
        entityType: "exercise",
        entityId: id,
        oldValues: oldExercise,
        newValues: updated,
      });
      return updated;
    });
    await invalidateByPrefix("exercises:");
    return { exercise };
  }

  async reviewExercise(
    actor: Actor,
    id: string,
    decision: ReviewDecision,
    requestMeta: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const exercise = await withTransaction(async (client: PoolClient) => {
      const oldExercise = await this.repository.findById(client, id);
      if (!oldExercise) throw new AppError(codes.NOT_FOUND, "Exercise not found", 404);
      if (!["pending", "rejected"].includes(oldExercise.status)) {
        throw new AppError(codes.CONFLICT, "Only pending or rejected exercises can be reviewed", 409);
      }
      const status = decision.status === "approved" ? "active" : "rejected";
      const updated = await this.repository.setReviewStatus(client, id, actor, status, decision.rejectionReason);
      if (oldExercise.created_by) {
        await this.notificationRepository.createNotification(client, {
          recipientId: oldExercise.created_by,
          actorId: actor.userId,
          type: `exercise_${status}`,
          title: `Exercise ${status}`,
          content: decision.rejectionReason || null,
          isImportant: true,
          metadata: { exerciseId: id },
        });
      }
      await this.auditRepository.createAudit(client, {
        actorId: actor.userId,
        action: `exercise.${status}`,
        entityType: "exercise",
        entityId: id,
        oldValues: oldExercise,
        newValues: updated,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
      return updated;
    });
    await invalidateByPrefix("exercises:");
    return { exercise };
  }

  async deactivateExercise(actor: Actor, id: string) {
    return this.updateExercise(actor, id, { status: "inactive" });
  }
}
