const { withTransaction } = require("../../db/pool");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const repository = require("./users.repository");
const { publicUser } = require("./userPresenter");
const auditRepository = require("../audit/audit.repository");
const notificationRepository = require("../notifications/notifications.repository");

async function getOwnProfile(user) {
  return { user: publicUser(user) };
}

async function updateOwnProfile(userId, payload) {
  const user = await repository.updateProfile(userId, payload);
  if (!user) throw new AppError(codes.NOT_FOUND, "User not found", 404);
  return { user: publicUser(user) };
}

async function listUsers(query) {
  const result = await repository.listUsers(query);
  return paginate({
    items: result.rows.map(publicUser),
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
}

async function getUserById(id) {
  const user = await repository.findById(id);
  if (!user) throw new AppError(codes.NOT_FOUND, "User not found", 404);
  return { user: publicUser(user) };
}

async function updateUserStatus(actor, targetUserId, status, requestMeta = {}) {
  const user = await withTransaction(async (client) => {
    const updated = await repository.setStatus(client, targetUserId, status);
    if (!updated.user) throw new AppError(codes.NOT_FOUND, "User not found", 404);
    await auditRepository.createAudit(client, {
      actorId: actor.userId,
      action: `user.${status}`,
      entityType: "app_user",
      entityId: targetUserId,
      oldValues: updated.oldUser,
      newValues: updated.user,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });
    await notificationRepository.createNotification(client, {
      recipientId: targetUserId,
      actorId: actor.userId,
      type: `account_${status}`,
      title: `Account ${status}`,
      isImportant: true,
      metadata: { userId: targetUserId },
    });
    return updated.user;
  });
  return { user: publicUser(user) };
}

module.exports = { getOwnProfile, updateOwnProfile, listUsers, getUserById, updateUserStatus };
