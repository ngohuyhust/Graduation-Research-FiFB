const repository = require("./exerciseTaxonomy.repository");

async function list(kind) {
  return { items: await repository.list(kind) };
}

async function create(kind, name) {
  return { item: await repository.create(kind, name) };
}

module.exports = { list, create };
