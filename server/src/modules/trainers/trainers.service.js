const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const repository = require("./trainers.repository");

async function listTrainers(filters) {
  const result = await repository.list(filters);
  return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
}

async function getTrainer(id) {
  const trainer = await repository.findById(id);
  if (!trainer) throw new AppError(codes.NOT_FOUND, "Trainer not found", 404);
  return { trainer };
}

async function saveOwnProfile(userId, payload) {
  return { profile: await repository.upsertProfile(userId, payload) };
}

module.exports = { listTrainers, getTrainer, saveOwnProfile };
