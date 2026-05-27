const { withTransaction } = require("../../db/pool");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const repository = require("./trainerCertificates.repository");
const trainersRepository = require("../trainers/trainers.repository");
const auditRepository = require("../audit/audit.repository");
const notificationRepository = require("../notifications/notifications.repository");

async function submit(trainerId, payload) {
  return { certificate: await repository.create(trainerId, payload) };
}

async function listMine(trainerId) {
  return { certificates: await repository.listByTrainer(trainerId) };
}

async function listAll(query) {
  const result = await repository.listAll(query);
  return paginate({ items: result.rows, page: query.page, limit: query.limit, total: result.total });
}

async function review(actor, id, decision) {
  const certificate = await withTransaction(async (client) => {
    const oldCertificate = await repository.findById(client, id);
    if (!oldCertificate) throw new AppError(codes.NOT_FOUND, "Certificate not found", 404);
    const updated = await repository.setReviewStatus(client, id, actor, decision);
    if (decision.status === "approved") await trainersRepository.markVerified(client, oldCertificate.trainer_id, actor.userId);
    await notificationRepository.createNotification(client, {
      recipientId: oldCertificate.trainer_id,
      actorId: actor.userId,
      type: `certificate_${decision.status}`,
      title: `Certificate ${decision.status}`,
      content: decision.rejectionReason || null,
      isImportant: true,
      metadata: { certificateId: id },
    });
    await auditRepository.createAudit(client, { actorId: actor.userId, action: `certificate.${decision.status}`, entityType: "trainer_certificate", entityId: id, oldValues: oldCertificate, newValues: updated });
    return updated;
  });
  return { certificate };
}

module.exports = { submit, listMine, listAll, review };
