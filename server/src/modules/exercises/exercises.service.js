const { withTransaction } = require("../../db/pool");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const repository = require("./exercises.repository");
const auditRepository = require("../audit/audit.repository");
const notificationRepository = require("../notifications/notifications.repository");

function hasMappingPayload(payload) {
  return ["bodyPartIds", "equipmentIds", "targetMuscleIds", "secondaryMuscleIds"].some((key) => Array.isArray(payload[key]));
}

async function listExercises(filters, admin = false) {
  const result = await repository.list(filters, admin);
  return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
}

async function getActiveExercise(id) {
  const exercise = await repository.findActiveById(id);
  if (!exercise) throw new AppError(codes.NOT_FOUND, "Exercise not found", 404);
  return { exercise };
}

async function createExercise(actor, payload, source) {
  const exercise = await withTransaction(async (client) => {
    const created = await repository.create(client, actor, payload, source);
    await repository.replaceMappings(client, created.id, payload);
    return created;
  });
  return { exercise };
}

async function updateExercise(actor, id, payload) {
  const exercise = await withTransaction(async (client) => {
    const oldExercise = await repository.findById(client, id);
    if (!oldExercise) throw new AppError(codes.NOT_FOUND, "Exercise not found", 404);
    const updated = await repository.update(client, id, payload);
    if (hasMappingPayload(payload)) await repository.replaceMappings(client, id, payload);
    await auditRepository.createAudit(client, { actorId: actor.userId, action: "exercise.update", entityType: "exercise", entityId: id, oldValues: oldExercise, newValues: updated });
    return updated;
  });
  return { exercise };
}

async function reviewExercise(actor, id, decision, requestMeta = {}) {
  const exercise = await withTransaction(async (client) => {
    const oldExercise = await repository.findById(client, id);
    if (!oldExercise) throw new AppError(codes.NOT_FOUND, "Exercise not found", 404);
    if (!["pending", "rejected"].includes(oldExercise.status)) {
      throw new AppError(codes.CONFLICT, "Only pending or rejected exercises can be reviewed", 409);
    }
    const status = decision.status === "approved" ? "active" : "rejected";
    const updated = await repository.setReviewStatus(client, id, actor, status, decision.rejectionReason);
    if (oldExercise.created_by) {
      await notificationRepository.createNotification(client, {
        recipientId: oldExercise.created_by,
        actorId: actor.userId,
        type: `exercise_${status}`,
        title: `Exercise ${status}`,
        content: decision.rejectionReason || null,
        isImportant: true,
        metadata: { exerciseId: id },
      });
    }
    await auditRepository.createAudit(client, {
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
  return { exercise };
}

async function deactivateExercise(actor, id) {
  return updateExercise(actor, id, { status: "inactive" });
}

module.exports = { listExercises, getActiveExercise, createExercise, updateExercise, reviewExercise, deactivateExercise, hasMappingPayload };
