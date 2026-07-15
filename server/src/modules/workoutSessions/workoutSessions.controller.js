// Controller xu ly request/response cho module workoutSessions.
const { sendCreated, sendSuccess } = require("../../utils/responses");
const service = require("./workoutSessions.service");

async function create(req, res) {
  return sendCreated(res, await service.create(req.auth.userId, req.body), "Workout session started");
}

async function list(req, res) {
  return sendSuccess(res, await service.list(req.auth.userId, req.query));
}

async function detail(req, res) {
  return sendSuccess(res, await service.detail(req.auth.userId, req.params.id));
}

async function update(req, res) {
  return sendSuccess(res, await service.update(req.auth.userId, req.params.id, req.body), "Workout session updated");
}

async function addLog(req, res) {
  return sendCreated(res, await service.addLog(req.auth.userId, req.params.id, req.body), "Exercise log added");
}

async function stats(req, res) {
  return sendSuccess(res, await service.stats(req.auth.userId));
}

async function progression(req, res) {
  return sendSuccess(res, await service.progression(req.auth.userId, req.params.exerciseId));
}

module.exports = { create, list, detail, update, addLog, stats, progression };
