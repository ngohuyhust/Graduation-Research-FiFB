const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const repository = require("./chat.repository");

function ioInstance() {
  return require("../../socket").getIO();
}

async function membership(connectionId, userId) {
  const connection = await repository.findMembership(connectionId, userId);
  if (!connection) throw new AppError(codes.FORBIDDEN, "Active trainer connection required", 403);
  return connection;
}

async function list(userId, connectionId, filters) {
  await membership(connectionId, userId);
  const result = await repository.listMessages(connectionId, filters);
  return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
}

async function send(userId, connectionId, payload) {
  await membership(connectionId, userId);
  const message = await repository.createMessage(connectionId, userId, payload);
  const io = ioInstance();
  if (io) io.to(`chat:${connectionId}`).emit("chat:receive", message);
  return { message };
}

async function markRead(userId, connectionId) {
  await membership(connectionId, userId);
  const updated = await repository.markRead(connectionId, userId);
  const io = ioInstance();
  if (io) io.to(`chat:${connectionId}`).emit("chat:read", { connectionId, userId, updated });
  return { updated };
}

async function unread(userId) {
  return { items: await repository.unreadCounts(userId) };
}

module.exports = { membership, list, send, markRead, unread };
