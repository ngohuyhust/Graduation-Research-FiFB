// Service chua nghiep vu chinh cua module workoutPlans.
const { withTransaction } = require("../../db/pool");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const repository = require("./workoutPlans.repository");
const exerciseRepository = require("../exercises/exercises.repository");

function assertUniqueWorkoutOrder(items = []) {
  const seen = new Set();
  for (const item of items) {
    const key = `${item.dayNumber}:${item.sortOrder}`;
    if (seen.has(key))
      throw new AppError(codes.CONFLICT, "Workout plan item order must be unique per day", 409, {
        dayNumber: item.dayNumber,
        sortOrder: item.sortOrder,
      });
    seen.add(key);
  }
}

async function insertItems(client, planId, items = []) {
  for (const item of items) {
    if (!(await exerciseRepository.ensureActive(client, item.exerciseId)))
      throw new AppError(codes.BAD_REQUEST, "Exercise must be active", 400);
    await repository.insertItem(client, planId, item);
  }
}

async function create(userId, payload) {
  const plan = await withTransaction(async (client) => {
    assertUniqueWorkoutOrder(payload.items);
    const created = await repository.createPlan(client, userId, payload);
    await insertItems(client, created.id, payload.items);
    return repository.getPlan(client, userId, created.id);
  });
  return { plan };
}

async function detail(userId, id) {
  const plan = await repository.getPlan({ query: require("../../db/pool").query }, userId, id);
  if (!plan) throw new AppError(codes.NOT_FOUND, "Workout plan not found", 404);
  return { plan };
}

async function list(userId, filters) {
  const result = await repository.list(userId, filters);
  return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
}

async function update(userId, id, payload) {
  const plan = await withTransaction(async (client) => {
    const updated = await repository.updatePlan(client, userId, id, payload);
    if (!updated) throw new AppError(codes.NOT_FOUND, "Workout plan not found", 404);
    if (payload.items) {
      assertUniqueWorkoutOrder(payload.items);
      await repository.deleteItems(client, id);
      await insertItems(client, id, payload.items);
    }
    return repository.getPlan(client, userId, id);
  });
  return { plan };
}

async function archive(userId, id) {
  const plan = await repository.archive(userId, id);
  if (!plan) throw new AppError(codes.NOT_FOUND, "Workout plan not found", 404);
  return { plan };
}

module.exports = { create, detail, list, update, archive, assertUniqueWorkoutOrder };
