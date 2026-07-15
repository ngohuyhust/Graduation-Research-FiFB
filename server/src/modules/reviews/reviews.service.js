// Service chua nghiep vu chinh cua module reviews.
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const repository = require("./reviews.repository");

async function upsertReview(userId, trainerId, payload) {
  if (!(await repository.hasConnection(userId, trainerId)))
    throw new AppError(codes.FORBIDDEN, "Trainer review requires a valid connection", 403);
  const existing = await repository.findMine(userId, trainerId);
  const review = existing
    ? await repository.updateMine(userId, trainerId, payload)
    : await repository.createMine(userId, trainerId, payload);
  return { review };
}

async function listTrainerReviews(trainerId, filters) {
  const result = await repository.listTrainerReviews(trainerId, filters);
  return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
}

module.exports = { upsertReview, listTrainerReviews };
