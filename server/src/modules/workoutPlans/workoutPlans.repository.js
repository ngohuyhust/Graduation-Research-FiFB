// Repository truy van du lieu cho module workoutPlans.
const { query } = require("../../db/pool");

function pageOffset({ page, limit }) {
  return (page - 1) * limit;
}

async function createPlan(client, userId, payload) {
  const result = await client.query(
    "INSERT INTO workout_plans (owner_id, created_by, title, description, visibility) VALUES ($1, $1, $2, $3, $4) RETURNING *",
    [userId, payload.title, payload.description || null, payload.visibility],
  );
  return result.rows[0];
}

async function insertItem(client, planId, item) {
  await client.query(
    `INSERT INTO workout_plan_items (workout_plan_id, exercise_id, day_number, sort_order, sets, reps, duration_seconds, rest_seconds, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      planId,
      item.exerciseId,
      item.dayNumber,
      item.sortOrder,
      item.sets || null,
      item.reps || null,
      item.durationSeconds || null,
      item.restSeconds ?? null,
      item.note || null,
    ],
  );
}

async function getPlan(client, userId, id) {
  const plan = await client.query("SELECT * FROM workout_plans WHERE id = $1 AND owner_id = $2", [id, userId]);
  if (!plan.rows[0]) return null;
  const items = await client.query(
    "SELECT * FROM workout_plan_items WHERE workout_plan_id = $1 ORDER BY day_number ASC, sort_order ASC",
    [id],
  );
  return { ...plan.rows[0], items: items.rows };
}

async function list(userId, filters) {
  const count = await query("SELECT count(*)::int AS total FROM workout_plans WHERE owner_id = $1", [userId]);
  const result = await query(
    "SELECT * FROM workout_plans WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [userId, filters.limit, pageOffset(filters)],
  );
  return { rows: result.rows, total: count.rows[0].total };
}

async function updatePlan(client, userId, id, payload) {
  const result = await client.query(
    "UPDATE workout_plans SET title = COALESCE($3, title), description = COALESCE($4, description), visibility = COALESCE($5, visibility), status = COALESCE($6, status), updated_at = now() WHERE id = $1 AND owner_id = $2 RETURNING *",
    [id, userId, payload.title, payload.description, payload.visibility, payload.status],
  );
  return result.rows[0] || null;
}

async function deleteItems(client, planId) {
  await client.query("DELETE FROM workout_plan_items WHERE workout_plan_id = $1", [planId]);
}

async function archive(userId, id) {
  const result = await query(
    "UPDATE workout_plans SET status = 'archived', updated_at = now() WHERE id = $1 AND owner_id = $2 RETURNING *",
    [id, userId],
  );
  return result.rows[0] || null;
}

module.exports = { createPlan, insertItem, getPlan, list, updatePlan, deleteItems, archive };
