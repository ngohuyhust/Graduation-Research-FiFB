const { sendSuccess, sendCreated } = require("../../utils/responses");
const service = require("./reviews.service");

async function create(req, res) {
  return sendCreated(res, await service.upsertReview(req.auth.userId, req.params.id, req.body), "Review saved");
}

async function list(req, res) {
  return sendSuccess(res, await service.listTrainerReviews(req.params.id, req.query));
}

module.exports = { create, list };
