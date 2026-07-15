// Controller xu ly request/response cho module notifications.
const { sendSuccess, sendNoContent } = require("../../utils/responses");
const service = require("./notifications.service");

async function list(req, res) {
  return sendSuccess(res, await service.listMine(req.auth.userId, req.query));
}

async function markRead(req, res) {
  return sendSuccess(res, await service.markRead(req.auth.userId, req.params.id), "Notification marked read");
}

async function markAllRead(req, res) {
  await service.markAllRead(req.auth.userId);
  return sendNoContent(res);
}

module.exports = { list, markRead, markAllRead };
