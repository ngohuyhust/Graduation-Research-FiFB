// Controller xu ly request/response cho module favorites.
const { sendSuccess, sendCreated, sendNoContent } = require("../../utils/responses");
const service = require("./favorites.service");

async function list(req, res) {
  return sendSuccess(res, await service.listFavorites(req.auth.userId, req.query));
}

async function add(req, res) {
  return sendCreated(res, await service.addFavorite(req.auth.userId, req.body.exerciseId), "Favorite added");
}

async function remove(req, res) {
  await service.removeFavorite(req.auth.userId, req.params.id);
  return sendNoContent(res);
}

module.exports = { list, add, remove };
