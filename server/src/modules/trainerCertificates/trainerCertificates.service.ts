import { Injectable } from "@nestjs/common";
import { TrainerCertificatesRepository } from "./trainerCertificates.repository";
import type { CertificatePayload, CertificateDecision, CertificateQuery } from "./trainerCertificates.validation";
import { DatabaseService } from "../../db/database.service";
import type { Actor } from "../../common/auth.guard";
import { TrainersRepository } from "../trainers/trainers.repository";
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const auditRepository = require("../audit/audit.repository");
import { NotificationsRepository } from "../notifications/notifications.repository";

@Injectable()
export class TrainerCertificatesService {
  constructor(private readonly notificationRepository: NotificationsRepository,
    private readonly repository: TrainerCertificatesRepository,
    private readonly database: DatabaseService,
    private readonly trainersRepository: TrainersRepository,
  ) {}

  async submit(trainerId: string, payload: CertificatePayload) {
    const certificate = await this.database.withTransaction(async (client) => {
      if (!(await this.repository.ensureTrainerProfile(client, trainerId))) {
        throw new AppError(codes.CONFLICT, "Trainer profile is required before submitting certificates", 409);
      }
      return this.repository.create(client, trainerId, payload);
    });
    return { certificate };
  }

  async listMine(trainerId: string) {
    return { certificates: await this.repository.listByTrainer(trainerId) };
  }

  async listAll(query: CertificateQuery) {
    const result = await this.repository.listAll(query);
    return paginate({ items: result.rows, page: query.page, limit: query.limit, total: result.total });
  }

  async review(
    actor: Actor,
    id: string,
    decision: CertificateDecision,
    requestMeta: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const certificate = await this.database.withTransaction(async (client) => {
      const oldCertificate = await this.repository.findById(client, id);
      if (!oldCertificate) throw new AppError(codes.NOT_FOUND, "Certificate not found", 404);
      if (oldCertificate.status !== "pending")
        throw new AppError(codes.CONFLICT, "Only pending certificates can be reviewed", 409);
      const updated = await this.repository.setReviewStatus(client, id, actor, decision);
      if (!updated) throw new AppError(codes.CONFLICT, "Only pending certificates can be reviewed", 409);
      if (decision.status === "approved") {
        const oldProfile = await this.trainersRepository.findProfileForUpdate(client, oldCertificate.trainer_id);
        const newProfile = await this.trainersRepository.markVerified(client, oldCertificate.trainer_id, actor.userId);
        await auditRepository.createAudit(client, {
          actorId: actor.userId,
          action: "trainer.verify",
          entityType: "trainer_profile",
          entityId: oldCertificate.trainer_id,
          oldValues: oldProfile,
          newValues: newProfile,
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
        });
      }
      await this.notificationRepository.createNotification(client, {
        recipientId: oldCertificate.trainer_id,
        actorId: actor.userId,
        type: `certificate_${decision.status}`,
        title: `Certificate ${decision.status}`,
        content: decision.rejectionReason || null,
        isImportant: true,
        metadata: { certificateId: id },
      });
      await auditRepository.createAudit(client, {
        actorId: actor.userId,
        action: `certificate.${decision.status}`,
        entityType: "trainer_certificate",
        entityId: id,
        oldValues: oldCertificate,
        newValues: updated,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
      return updated;
    });
    return { certificate };
  }
}
