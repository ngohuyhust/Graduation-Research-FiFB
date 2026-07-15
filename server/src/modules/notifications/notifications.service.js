// Service chua nghiep vu chinh cua module notifications.
const { paginate } = require("../../utils/responses");
const repository = require("./notifications.repository");

async function listMine(userId, query) {
  const result = await repository.listMine(userId, query);
  return paginate({ items: result.rows, page: query.page, limit: query.limit, total: result.total });
}

async function markRead(userId, id) {
  return { notification: await repository.markRead(userId, id) };
}

async function markAllRead(userId) {
  await repository.markAllRead(userId);
}

module.exports = { listMine, markRead, markAllRead };
