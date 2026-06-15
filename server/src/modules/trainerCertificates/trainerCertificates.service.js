const { withTransaction } = require("../../db/pool");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const repository = require("./trainerCertificates.repository");
const trainersRepository = require("../trainers/trainers.repository");
const auditRepository = require("../audit/audit.repository");
const notificationRepository = require("../notifications/notifications.repository");

async function submit(trainerId, payload) {
  const certificate = await withTransaction(async (client) => {
    if (!(await repository.ensureTrainerProfile(client, trainerId))) {
      throw new AppError(codes.CONFLICT, "Trainer profile is required before submitting certificates", 409);
    }
    return repository.create(client, trainerId, payload);
  });
  return { certificate };
}

async function listMine(trainerId) {
  return { certificates: await repository.listByTrainer(trainerId) };
}

async function listAll(query) {
  const result = await repository.listAll(query);
  return paginate({ items: result.rows, page: query.page, limit: query.limit, total: result.total });
}

async function review(actor, id, decision, requestMeta = {}) {
  const certificate = await withTransaction(async (client) => {
    const oldCertificate = await repository.findById(client, id);
    if (!oldCertificate) throw new AppError(codes.NOT_FOUND, "Certificate not found", 404);
    if (oldCertificate.status !== "pending")
      throw new AppError(codes.CONFLICT, "Only pending certificates can be reviewed", 409);
    const updated = await repository.setReviewStatus(client, id, actor, decision);
    if (!updated) throw new AppError(codes.CONFLICT, "Only pending certificates can be reviewed", 409);
    if (decision.status === "approved") {
      const oldProfile = await trainersRepository.findProfileForUpdate(client, oldCertificate.trainer_id);
      const newProfile = await trainersRepository.markVerified(client, oldCertificate.trainer_id, actor.userId);
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
    await notificationRepository.createNotification(client, {
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

module.exports = { submit, listMine, listAll, review };
