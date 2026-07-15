// Repository truy van du lieu cho module users.
const { query } = require("../../db/pool");

const selectable = `
  id, email, full_name, phone, avatar_url, role, status, email_verified_at,
  last_login_at, password_changed_at, fitness_goal, experience_level,
  gender, weight, height, created_at, updated_at
`;

async function createUser(client, user) {
  const result = await client.query(
    `INSERT INTO app_users (
       email, password_hash, full_name, phone, role, status,
       fitness_goal, experience_level, gender, weight, height
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${selectable}`,
    [
      user.email,
      user.passwordHash,
      user.fullName || null,
      user.phone,
      user.role || "user",
      user.status,
      user.fitnessGoal || null,
      user.experienceLevel || null,
      user.gender || null,
      user.weight || null,
      user.height || null,
    ],
  );
  return result.rows[0];
}

async function findByEmail(email, client = { query }) {
  const result = await client.query(
    `SELECT *, password_hash FROM app_users WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
    [email],
  );
  return result.rows[0] || null;
}

async function findById(id, client = { query }) {
  const result = await client.query(`SELECT ${selectable} FROM app_users WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return result.rows[0] || null;
}

async function findAuthById(id, client = { query }) {
  const result = await client.query(`SELECT *, password_hash FROM app_users WHERE id = $1 AND deleted_at IS NULL`, [
    id,
  ]);
  return result.rows[0] || null;
}

async function updateProfile(id, payload) {
  const result = await query(
    `UPDATE app_users
     SET full_name = COALESCE($2, full_name),
         phone = COALESCE($3, phone),
         avatar_url = COALESCE($4, avatar_url),
         fitness_goal = COALESCE($5, fitness_goal),
         experience_level = COALESCE($6, experience_level),
         gender = COALESCE($7, gender),
         weight = COALESCE($8, weight),
         height = COALESCE($9, height),
         updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${selectable}`,
    [
      id,
      payload.fullName,
      payload.phone,
      payload.avatarUrl,
      payload.fitnessGoal,
      payload.experienceLevel,
      payload.gender,
      payload.weight,
      payload.height,
    ],
  );
  return result.rows[0] || null;
}

async function updatePassword(client, id, passwordHash) {
  await client.query(
    `UPDATE app_users SET password_hash = $2, password_changed_at = now(), updated_at = now() WHERE id = $1`,
    [id, passwordHash],
  );
}

async function markVerified(client, id) {
  const result = await client.query(
    `UPDATE app_users SET email_verified_at = now(), status = 'active', updated_at = now()
     WHERE id = $1 AND status = 'pending_verification'
     RETURNING ${selectable}`,
    [id],
  );
  return result.rows[0] || null;
}

async function touchLastLogin(id) {
  await query("UPDATE app_users SET last_login_at = now(), updated_at = now() WHERE id = $1", [id]);
}

async function listUsers({ page, limit, role, status, keyword }) {
  const offset = (page - 1) * limit;
  const filters = ["deleted_at IS NULL"];
  const values = [];
  if (role) {
    values.push(role);
    filters.push(`role = $${values.length}`);
  }
  if (status) {
    values.push(status);
    filters.push(`status = $${values.length}`);
  }
  if (keyword) {
    values.push(`%${keyword}%`);
    filters.push(`(email ILIKE $${values.length} OR full_name ILIKE $${values.length})`);
  }
  const where = filters.join(" AND ");
  const count = await query(`SELECT count(*)::int AS total FROM app_users WHERE ${where}`, values);
  const result = await query(
    `SELECT ${selectable} FROM app_users WHERE ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );
  return { rows: result.rows, total: count.rows[0].total };
}

async function setStatus(client, id, status) {
  const oldResult = await client.query(`SELECT ${selectable} FROM app_users WHERE id = $1`, [id]);
  const result = await client.query(
    `UPDATE app_users SET status = $2, updated_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING ${selectable}`,
    [id, status],
  );
  return { oldUser: oldResult.rows[0] || null, user: result.rows[0] || null };
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findAuthById,
  updateProfile,
  updatePassword,
  markVerified,
  touchLastLogin,
  listUsers,
  setStatus,
};
