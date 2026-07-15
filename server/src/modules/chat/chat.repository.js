// Repository truy van du lieu cho module chat.
const { query } = require("../../db/pool");

async function findMembership(connectionId, userId) {
  const result = await query(
    `SELECT utc.*, user_account.full_name AS user_name, trainer_account.full_name AS trainer_name
     FROM user_trainer_connections utc
     JOIN app_users user_account ON user_account.id = utc.user_id
     JOIN app_users trainer_account ON trainer_account.id = utc.trainer_id
     WHERE utc.id = $1 AND utc.status = 'active' AND ($2 = utc.user_id OR $2 = utc.trainer_id)`,
    [connectionId, userId],
  );
  return result.rows[0] || null;
}

async function listMessages(connectionId, { page, limit }) {
  const total = await query("SELECT count(*)::int AS total FROM chat_messages WHERE connection_id = $1", [
    connectionId,
  ]);
  const offset = Math.max(total.rows[0].total - page * limit, 0);
  const result = await query(
    `SELECT cm.*, u.full_name AS sender_name
     FROM chat_messages cm
     JOIN app_users u ON u.id = cm.sender_id
     WHERE cm.connection_id = $1
     ORDER BY cm.created_at ASC
     LIMIT $2 OFFSET $3`,
    [connectionId, limit, offset],
  );
  return { rows: result.rows, total: total.rows[0].total };
}

async function createMessage(connectionId, senderId, payload) {
  const result = await query(
    `INSERT INTO chat_messages (connection_id, sender_id, content, message_type)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [connectionId, senderId, payload.content, payload.messageType],
  );
  return result.rows[0];
}

async function markRead(connectionId, userId) {
  const result = await query(
    `UPDATE chat_messages
     SET read_at = COALESCE(read_at, now())
     WHERE connection_id = $1 AND sender_id <> $2 AND read_at IS NULL
     RETURNING id`,
    [connectionId, userId],
  );
  return result.rowCount;
}

async function unreadCounts(userId) {
  const result = await query(
    `SELECT cm.connection_id, count(*)::int AS unread_count
     FROM chat_messages cm
     JOIN user_trainer_connections utc ON utc.id = cm.connection_id
     WHERE utc.status = 'active'
       AND ($1 = utc.user_id OR $1 = utc.trainer_id)
       AND cm.sender_id <> $1
       AND cm.read_at IS NULL
     GROUP BY cm.connection_id`,
    [userId],
  );
  return result.rows;
}

module.exports = { findMembership, listMessages, createMessage, markRead, unreadCounts };
