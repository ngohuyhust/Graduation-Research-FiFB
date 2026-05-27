const { sendSuccess, sendCreated } = require("../../utils/responses");
const service = require("./workoutPlans.service");

async function list(req, res) {
  return sendSuccess(res, await service.list(req.auth.userId, req.query));
}

async function create(req, res) {
  return sendCreated(res, await service.create(req.auth.userId, req.body), "Workout plan created");
}

async function detail(req, res) {
  return sendSuccess(res, await service.detail(req.auth.userId, req.params.id));
}

async function update(req, res) {
  return sendSuccess(res, await service.update(req.auth.userId, req.params.id, req.body), "Workout plan updated");
}

async function archive(req, res) {
  return sendSuccess(res, await service.archive(req.auth.userId, req.params.id), "Workout plan archived");
}

module.exports = { list, create, detail, update, archive };
