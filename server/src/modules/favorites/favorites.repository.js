// Repository truy van du lieu cho module favorites.
const { query } = require("../../db/pool");
const { exerciseLibrarySelect, camelExercise } = require("../exercises/exercises.repository");

function pageOffset({ page, limit }) {
  return (page - 1) * limit;
}

async function add(client, userId, exerciseId) {
  const result = await client.query(
    `INSERT INTO favorite_exercises (user_id, exercise_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, exercise_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId, exerciseId],
  );
  return result.rows[0] || null;
}

async function remove(userId, exerciseId) {
  await query("DELETE FROM favorite_exercises WHERE user_id = $1 AND exercise_id = $2", [userId, exerciseId]);
}

async function list(userId, filters) {
  const count = await query(
    `SELECT count(*)::int AS total
     FROM favorite_exercises f
     JOIN exercises e ON e.id = f.exercise_id
     WHERE f.user_id = $1 AND e.status = 'active'`,
    [userId],
  );
  const result = await query(
    `SELECT ${exerciseLibrarySelect("e")}
     FROM favorite_exercises f
     JOIN exercises e ON e.id = f.exercise_id
     WHERE f.user_id = $1 AND e.status = 'active'
     ORDER BY f.created_at DESC LIMIT $2 OFFSET $3`,
    [userId, filters.limit, pageOffset(filters)],
  );
  return { rows: result.rows.map(camelExercise), total: count.rows[0].total };
}

module.exports = { add, remove, list };
