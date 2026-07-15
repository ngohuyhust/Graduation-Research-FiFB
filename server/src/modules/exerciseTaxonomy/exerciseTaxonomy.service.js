// Service chua nghiep vu chinh cua module exerciseTaxonomy.
const repository = require("./exerciseTaxonomy.repository");
const { invalidateByPrefix } = require("../../utils/cache");

async function list(kind) {
  return { items: await repository.list(kind) };
}

async function create(kind, name) {
  const item = await repository.create(kind, name);
  await invalidateByPrefix("taxonomy:");
  return { item };
}

module.exports = { list, create };
