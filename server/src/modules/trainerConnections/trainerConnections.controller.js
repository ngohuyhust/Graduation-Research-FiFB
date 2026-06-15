const { sendSuccess, sendCreated } = require("../../utils/responses");
const service = require("./trainerConnections.service");

async function list(req, res) {
  return sendSuccess(res, await service.listRequests(req.user));
}

async function listConnections(req, res) {
  return sendSuccess(res, await service.listConnections(req.user));
}

async function create(req, res) {
  return sendCreated(res, await service.sendRequest(req.auth.userId, req.body), "Trainer connection request sent");
}

async function cancel(req, res) {
  return sendSuccess(res, await service.cancelRequest(req.auth.userId, req.params.id), "Request cancelled");
}

async function approve(req, res) {
  return sendSuccess(res, await service.decide(req.auth, req.params.id, "approved"), "Request approved");
}

async function reject(req, res) {
  return sendSuccess(
    res,
    await service.decide(req.auth, req.params.id, "rejected", req.body.rejectReason),
    "Request rejected",
  );
}

module.exports = { list, listConnections, create, cancel, approve, reject };
