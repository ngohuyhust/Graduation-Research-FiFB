const { sendSuccess, sendCreated } = require("../../utils/responses");
const service = require("./trainerCertificates.service");

async function submitMine(req, res) {
  return sendCreated(res, await service.submit(req.auth.userId, req.body), "Certificate submitted");
}

async function listMine(req, res) {
  return sendSuccess(res, await service.listMine(req.auth.userId));
}

async function listAll(req, res) {
  return sendSuccess(res, await service.listAll(req.query));
}

async function review(req, res) {
  return sendSuccess(
    res,
    await service.review(req.auth, req.params.id, req.body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Certificate reviewed",
  );
}

module.exports = { submitMine, listMine, listAll, review };
