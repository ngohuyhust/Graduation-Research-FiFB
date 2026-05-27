const { query } = require("../../db/pool");

function pageOffset({ page, limit }) {
  return (page - 1) * limit;
}

async function hasConnection(userId, trainerId) {
  const result = await query("SELECT 1 FROM user_trainer_connections WHERE user_id = $1 AND trainer_id = $2", [userId, trainerId]);
  return Boolean(result.rows[0]);
}

async function findMine(userId, trainerId) {
  const result = await query("SELECT id FROM trainer_reviews WHERE user_id = $1 AND trainer_id = $2", [userId, trainerId]);
  return result.rows[0] || null;
}

async function updateMine(userId, trainerId, payload) {
  const result = await query(
    "UPDATE trainer_reviews SET rating = $3, comment = $4 WHERE user_id = $1 AND trainer_id = $2 RETURNING *",
    [userId, trainerId, payload.rating, payload.comment || null],
  );
  return result.rows[0];
}

async function createMine(userId, trainerId, payload) {
  const result = await query(
    "INSERT INTO trainer_reviews (user_id, trainer_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, trainerId, payload.rating, payload.comment || null],
  );
  return result.rows[0];
}

async function listTrainerReviews(trainerId, filters) {
  const count = await query("SELECT count(*)::int AS total FROM trainer_reviews WHERE trainer_id = $1 AND status = 'visible'", [trainerId]);
  const result = await query("SELECT * FROM trainer_reviews WHERE trainer_id = $1 AND status = 'visible' ORDER BY created_at DESC LIMIT $2 OFFSET $3", [trainerId, filters.limit, pageOffset(filters)]);
  return { rows: result.rows, total: count.rows[0].total };
}

module.exports = { hasConnection, findMine, updateMine, createMine, listTrainerReviews };
