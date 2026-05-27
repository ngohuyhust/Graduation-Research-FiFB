const { sendSuccess, sendCreated } = require("../../utils/responses");
const service = require("./exerciseTaxonomy.service");

function list(kind) {
  return async (_req, res) => sendSuccess(res, await service.list(kind));
}

function create(kind) {
  return async (req, res) => sendCreated(res, await service.create(kind, req.body.name), "Taxonomy item saved");
}

module.exports = { list, create };
