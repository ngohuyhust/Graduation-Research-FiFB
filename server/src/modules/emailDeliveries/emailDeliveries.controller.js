// Controller xu ly request/response cho module emailDeliveries.
const { sendSuccess } = require("../../utils/responses");
const service = require("./emailDeliveries.service");

async function list(req, res) {
  return sendSuccess(res, await service.list(req.query));
}

module.exports = { list };
