const { sendSuccess, sendCreated } = require("../../utils/responses");
const service = require("./exercises.service");

async function list(req, res) {
  return sendSuccess(res, await service.listExercises(req.query, false));
}

async function detail(req, res) {
  return sendSuccess(res, await service.getActiveExercise(req.params.id));
}

async function create(req, res) {
  return sendCreated(res, await service.createExercise(req.auth, req.body, "admin"), "Exercise created");
}

async function update(req, res) {
  return sendSuccess(res, await service.updateExercise(req.auth, req.params.id, req.body), "Exercise updated");
}

module.exports = { list, detail, create, update };
