const { sendSuccess } = require("../../utils/responses");
const service = require("./admin.service");

async function listUsers(req, res) {
  return sendSuccess(res, await service.listUsers(req.query));
}

async function updateUserStatus(req, res) {
  return sendSuccess(
    res,
    await service.updateUserStatus(req.auth, req.params.id, req.body.status, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "User status updated",
  );
}

async function listCertificates(req, res) {
  return sendSuccess(res, await service.listCertificates(req.query));
}

async function reviewCertificate(req, res) {
  return sendSuccess(
    res,
    await service.reviewCertificate(req.auth, req.params.id, req.body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Certificate reviewed",
  );
}

async function listExercises(req, res) {
  return sendSuccess(res, await service.listExercises(req.query));
}

async function reviewExercise(req, res) {
  return sendSuccess(
    res,
    await service.reviewExercise(req.auth, req.params.id, req.body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Exercise reviewed",
  );
}

async function deactivateExercise(req, res) {
  return sendSuccess(res, await service.deactivateExercise(req.auth, req.params.id), "Exercise deactivated");
}

async function listAuditLogs(req, res) {
  return sendSuccess(res, await service.listAuditLogs(req.query));
}

async function listEmailDeliveries(req, res) {
  return sendSuccess(res, await service.listEmailDeliveries(req.query));
}

module.exports = {
  listUsers,
  updateUserStatus,
  listCertificates,
  reviewCertificate,
  listExercises,
  reviewExercise,
  deactivateExercise,
  listAuditLogs,
  listEmailDeliveries,
};
