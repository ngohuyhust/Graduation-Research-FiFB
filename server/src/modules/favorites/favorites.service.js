// Service chua nghiep vu chinh cua module favorites.
const { withTransaction } = require("../../db/pool");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const repository = require("./favorites.repository");
const exerciseRepository = require("../exercises/exercises.repository");

async function addFavorite(userId, exerciseId) {
  const favorite = await withTransaction(async (client) => {
    if (!(await exerciseRepository.ensureActive(client, exerciseId)))
      throw new AppError(codes.BAD_REQUEST, "Exercise must be active", 400);
    const created = await repository.add(client, userId, exerciseId);
    return created;
  });
  return { favorite };
}

async function removeFavorite(userId, exerciseId) {
  await repository.remove(userId, exerciseId);
}

async function listFavorites(userId, filters) {
  const result = await repository.list(userId, filters);
  return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
}

module.exports = { addFavorite, removeFavorite, listFavorites };
