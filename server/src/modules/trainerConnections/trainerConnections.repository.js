const { query } = require("../../db/pool");

async function findPending(client, userId, trainerId) {
  const result = await client.query("SELECT 1 FROM trainer_connection_requests WHERE user_id = $1 AND trainer_id = $2 AND status = 'pending'", [userId, trainerId]);
  return result.rows[0] || null;
}

async function findActiveConnection(client, userId, trainerId) {
  const result = await client.query("SELECT 1 FROM user_trainer_connections WHERE user_id = $1 AND trainer_id = $2 AND status = 'active'", [userId, trainerId]);
  return result.rows[0] || null;
}

async function findTrainerProfile(client, trainerId) {
  const result = await client.query(
    `SELECT tp.trainer_id
     FROM trainer_profiles tp
     JOIN app_users u ON u.id = tp.trainer_id
     WHERE tp.trainer_id = $1 AND u.role = 'trainer' AND u.status = 'active' AND u.deleted_at IS NULL`,
    [trainerId],
  );
  return result.rows[0] || null;
}

async function createRequest(client, userId, payload) {
  const result = await client.query(
    `INSERT INTO trainer_connection_requests (user_id, trainer_id, goal_snapshot, message)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, payload.trainerId, payload.goalSnapshot || null, payload.message || null],
  );
  return result.rows[0];
}

async function cancel(userId, id) {
  const result = await query(
    `UPDATE trainer_connection_requests SET status = 'cancelled', cancelled_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING *`,
    [id, userId],
  );
  return result.rows[0] || null;
}

async function findPendingForTrainer(client, id, trainerId) {
  const result = await client.query("SELECT * FROM trainer_connection_requests WHERE id = $1 AND trainer_id = $2 AND status = 'pending'", [id, trainerId]);
  return result.rows[0] || null;
}

async function setDecision(client, id, status, rejectReason) {
  const result = await client.query(
    "UPDATE trainer_connection_requests SET status = $2, reject_reason = $3, responded_at = now(), updated_at = now() WHERE id = $1 AND status = 'pending' RETURNING *",
    [id, status, rejectReason || null],
  );
  return result.rows[0] || null;
}

async function createConnection(client, request) {
  await client.query(
    "INSERT INTO user_trainer_connections (user_id, trainer_id, request_id) VALUES ($1, $2, $3)",
    [request.user_id, request.trainer_id, request.id],
  );
}

async function listRequests(user) {
  const result = await query(
    user.role === "trainer"
      ? "SELECT * FROM trainer_connection_requests WHERE trainer_id = $1 ORDER BY created_at DESC"
      : "SELECT * FROM trainer_connection_requests WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id],
  );
  return result.rows;
}

async function listConnections(user) {
  const result = await query(
    user.role === "trainer"
      ? "SELECT * FROM user_trainer_connections WHERE trainer_id = $1 ORDER BY connected_at DESC"
      : "SELECT * FROM user_trainer_connections WHERE user_id = $1 ORDER BY connected_at DESC",
    [user.id],
  );
  return result.rows;
}

module.exports = { findPending, findActiveConnection, findTrainerProfile, createRequest, cancel, findPendingForTrainer, setDecision, createConnection, listRequests, listConnections };
