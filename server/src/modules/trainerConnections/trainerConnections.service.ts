import { Injectable } from "@nestjs/common";
import { TrainerConnectionsRepository } from "./trainerConnections.repository";
import type { ConnectionRequestPayload } from "./trainerConnections.validation";
import { DatabaseService } from "../../db/database.service";
import type { Actor } from "../../common/auth.guard";
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
import { NotificationsRepository } from "../notifications/notifications.repository";

@Injectable()
export class TrainerConnectionsService {
  constructor(private readonly notificationRepository: NotificationsRepository,
    private readonly repository: TrainerConnectionsRepository,
    private readonly database: DatabaseService,
  ) {}

  async sendRequest(userId: string, payload: ConnectionRequestPayload) {
    const request = await this.database.withTransaction(async (client) => {
      if (userId === payload.trainerId) throw new AppError(codes.BAD_REQUEST, "Cannot connect to yourself", 400);
      if (!(await this.repository.findTrainerProfile(client, payload.trainerId)))
        throw new AppError(codes.NOT_FOUND, "Trainer not found", 404);
      if (await this.repository.findPending(client, userId, payload.trainerId))
        throw new AppError(codes.CONFLICT, "A pending trainer request already exists", 409);
      if (await this.repository.findActiveConnection(client, userId, payload.trainerId))
        throw new AppError(codes.CONFLICT, "An active trainer connection already exists", 409);
      const created = await this.repository.createRequest(client, userId, payload);
      await this.notificationRepository.createNotification(client, {
        recipientId: payload.trainerId,
        actorId: userId,
        type: "trainer_request_pending",
        title: "New trainer connection request",
        isImportant: true,
        metadata: { requestId: created.id },
      });
      return created;
    });
    return { request };
  }

  async cancelRequest(userId: string, id: string) {
    const request = await this.repository.cancel(userId, id);
    if (!request) throw new AppError(codes.NOT_FOUND, "Pending request not found", 404);
    return { request };
  }

  async decide(actor: Actor, id: string, status: "approved" | "rejected", rejectReason?: string) {
    const request = await this.database.withTransaction(async (client) => {
      const pending = await this.repository.findPendingForTrainer(client, id, actor.userId);
      if (!pending) throw new AppError(codes.NOT_FOUND, "Pending request not found", 404);
      if (status === "approved") {
        if (await this.repository.findActiveConnection(client, pending.user_id, actor.userId))
          throw new AppError(codes.CONFLICT, "An active trainer connection already exists", 409);
      }
      const updated = await this.repository.setDecision(client, id, status, rejectReason);
      if (!updated) throw new AppError(codes.CONFLICT, "Only pending requests can be reviewed", 409);
      if (status === "approved") {
        await this.repository.createConnection(client, pending);
      }
      await this.notificationRepository.createNotification(client, {
        recipientId: pending.user_id,
        actorId: actor.userId,
        type: `trainer_request_${status}`,
        title: `Trainer request ${status}`,
        content: rejectReason || null,
        isImportant: true,
        metadata: { requestId: id },
      });
      return updated;
    });
    return { request };
  }

  async listRequests(user: { id: string; role: string }) {
    return { requests: await this.repository.listRequests(user) };
  }

  async listConnections(user: { id: string; role: string }) {
    return { connections: await this.repository.listConnections(user) };
  }
}
