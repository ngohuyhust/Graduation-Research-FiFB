const { withTransaction } = require("../../db/pool");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const repository = require("./trainerConnections.repository");
const notificationRepository = require("../notifications/notifications.repository");

async function sendRequest(userId, payload) {
  const request = await withTransaction(async (client) => {
    if (userId === payload.trainerId) throw new AppError(codes.BAD_REQUEST, "Cannot connect to yourself", 400);
    if (!await repository.findTrainerProfile(client, payload.trainerId)) throw new AppError(codes.NOT_FOUND, "Trainer not found", 404);
    if (await repository.findPending(client, userId, payload.trainerId)) throw new AppError(codes.CONFLICT, "A pending trainer request already exists", 409);
    if (await repository.findActiveConnection(client, userId, payload.trainerId)) throw new AppError(codes.CONFLICT, "An active trainer connection already exists", 409);
    const created = await repository.createRequest(client, userId, payload);
    await notificationRepository.createNotification(client, { recipientId: payload.trainerId, actorId: userId, type: "trainer_request_pending", title: "New trainer connection request", isImportant: true, metadata: { requestId: created.id } });
    return created;
  });
  return { request };
}

async function cancelRequest(userId, id) {
  const request = await repository.cancel(userId, id);
  if (!request) throw new AppError(codes.NOT_FOUND, "Pending request not found", 404);
  return { request };
}

async function decide(actor, id, status, rejectReason) {
  const request = await withTransaction(async (client) => {
    const pending = await repository.findPendingForTrainer(client, id, actor.userId);
    if (!pending) throw new AppError(codes.NOT_FOUND, "Pending request not found", 404);
    if (status === "approved") {
      if (await repository.findActiveConnection(client, pending.user_id, actor.userId)) throw new AppError(codes.CONFLICT, "An active trainer connection already exists", 409);
    }
    const updated = await repository.setDecision(client, id, status, rejectReason);
    if (!updated) throw new AppError(codes.CONFLICT, "Only pending requests can be reviewed", 409);
    if (status === "approved") {
      await repository.createConnection(client, pending);
    }
    await notificationRepository.createNotification(client, { recipientId: pending.user_id, actorId: actor.userId, type: `trainer_request_${status}`, title: `Trainer request ${status}`, content: rejectReason || null, isImportant: true, metadata: { requestId: id } });
    return updated;
  });
  return { request };
}

async function listRequests(user) {
  return { requests: await repository.listRequests(user) };
}

async function listConnections(user) {
  return { connections: await repository.listConnections(user) };
}

module.exports = { sendRequest, cancelRequest, decide, listRequests, listConnections };
