const { query } = require("../../db/pool");

function pageOffset({ page, limit }) {
  return (page - 1) * limit;
}

async function list(filters) {
  const values = [];
  const clauses = ["u.status = 'active'", "u.deleted_at IS NULL", "u.role = 'trainer'"];
  if (filters.specialization) {
    values.push(`%${filters.specialization}%`);
    clauses.push(`tp.specialization ILIKE $${values.length}`);
  }
  if (filters.verified !== undefined) {
    values.push(filters.verified);
    clauses.push(`tp.is_verified = $${values.length}`);
  }
  const where = clauses.join(" AND ");
  const count = await query(`SELECT count(*)::int AS total FROM trainer_profiles tp JOIN app_users u ON u.id = tp.trainer_id WHERE ${where}`, values);
  const result = await query(
    `SELECT tp.*, u.email, u.full_name, u.avatar_url
     FROM trainer_profiles tp JOIN app_users u ON u.id = tp.trainer_id
     WHERE ${where} ORDER BY tp.is_verified DESC, u.full_name ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, filters.limit, pageOffset(filters)],
  );
  return { rows: result.rows, total: count.rows[0].total };
}

async function findById(id) {
  const result = await query(
    "SELECT tp.*, u.email, u.full_name, u.avatar_url FROM trainer_profiles tp JOIN app_users u ON u.id = tp.trainer_id WHERE tp.trainer_id = $1",
    [id],
  );
  return result.rows[0] || null;
}

async function findProfileForUpdate(client, trainerId) {
  const result = await client.query("SELECT * FROM trainer_profiles WHERE trainer_id = $1", [trainerId]);
  return result.rows[0] || null;
}

async function upsertProfile(userId, payload) {
  const result = await query(
    `INSERT INTO trainer_profiles (trainer_id, bio, specialization, years_of_experience)
     VALUES ($1, $2, $3, COALESCE($4, 0))
     ON CONFLICT (trainer_id) DO UPDATE SET bio = COALESCE($2, trainer_profiles.bio), specialization = COALESCE($3, trainer_profiles.specialization), years_of_experience = COALESCE($4, trainer_profiles.years_of_experience), updated_at = now()
     RETURNING *`,
    [userId, payload.bio || null, payload.specialization || null, payload.yearsOfExperience],
  );
  return result.rows[0];
}

async function markVerified(client, trainerId, adminId) {
  const result = await client.query("UPDATE trainer_profiles SET is_verified = true, verified_at = now(), verified_by = $2, updated_at = now() WHERE trainer_id = $1 RETURNING *", [trainerId, adminId]);
  return result.rows[0] || null;
}

module.exports = { list, findById, findProfileForUpdate, upsertProfile, markVerified };
