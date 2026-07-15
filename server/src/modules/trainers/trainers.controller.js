// Controller xu ly request/response cho module trainers.
const { sendSuccess } = require("../../utils/responses");
const service = require("./trainers.service");

async function list(req, res) {
  return sendSuccess(res, await service.listTrainers(req.query));
}

async function detail(req, res) {
  return sendSuccess(res, await service.getTrainer(req.params.id));
}

async function saveMe(req, res) {
  return sendSuccess(res, await service.saveOwnProfile(req.auth.userId, req.body), "Trainer profile saved");
}

module.exports = { list, detail, saveMe };
