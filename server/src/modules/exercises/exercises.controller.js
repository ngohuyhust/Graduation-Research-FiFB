// Controller xu ly request/response cho module exercises.
const { sendSuccess, sendCreated } = require("../../utils/responses");
const service = require("./exercises.service");

async function list(req, res) {
  return sendSuccess(res, await service.listExercises(req.query, false));
}

async function detail(req, res) {
  return sendSuccess(res, await service.getActiveExercise(req.params.id));
}

async function create(req, res) {
  const source = req.auth.role === "trainer" ? "trainer_submission" : "admin";
  return sendCreated(res, await service.createExercise(req.auth, req.body, source), "Exercise created");
}

async function update(req, res) {
  return sendSuccess(res, await service.updateExercise(req.auth, req.params.id, req.body), "Exercise updated");
}

module.exports = { list, detail, create, update };
