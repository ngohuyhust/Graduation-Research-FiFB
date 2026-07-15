// Controller xu ly request/response cho module users.
const service = require("./users.service");
const { sendSuccess } = require("../../utils/responses");

async function me(req, res) {
  return sendSuccess(res, await service.getOwnProfile(req.user));
}

async function updateMe(req, res) {
  return sendSuccess(res, await service.updateOwnProfile(req.auth.userId, req.body), "Profile updated");
}

async function list(req, res) {
  return sendSuccess(res, await service.listUsers(req.query));
}

async function getById(req, res) {
  return sendSuccess(res, await service.getUserById(req.params.id));
}

async function updateStatus(req, res) {
  return sendSuccess(
    res,
    await service.updateUserStatus(req.auth, req.params.id, req.body.status, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "User status updated",
  );
}

module.exports = { me, updateMe, list, getById, updateStatus };
