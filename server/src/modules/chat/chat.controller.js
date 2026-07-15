// Controller xu ly request/response cho module chat.
const { sendCreated, sendSuccess } = require("../../utils/responses");
const service = require("./chat.service");

async function list(req, res) {
  return sendSuccess(res, await service.list(req.auth.userId, req.params.connectionId, req.query));
}

async function send(req, res) {
  return sendCreated(res, await service.send(req.auth.userId, req.params.connectionId, req.body), "Message sent");
}

async function markRead(req, res) {
  return sendSuccess(res, await service.markRead(req.auth.userId, req.params.connectionId), "Messages marked read");
}

async function unread(req, res) {
  return sendSuccess(res, await service.unread(req.auth.userId));
}

module.exports = { list, send, markRead, unread };
