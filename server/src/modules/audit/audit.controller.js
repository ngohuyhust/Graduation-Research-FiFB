// Controller xu ly request/response cho module audit.
const { sendSuccess } = require("../../utils/responses");
const service = require("./audit.service");

async function list(req, res) {
  return sendSuccess(res, await service.listAuditLogs(req.query));
}

module.exports = { list };
