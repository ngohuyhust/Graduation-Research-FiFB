const { query } = require("../../db/pool");

async function createNotification(client, payload) {
  const runner = client || { query };
  const result = await runner.query(
    `INSERT INTO notifications (recipient_id, actor_id, type, title, content, action_url, is_important, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      payload.recipientId,
      payload.actorId || null,
      payload.type,
      payload.title,
      payload.content || null,
      payload.actionUrl || null,
      payload.isImportant || false,
      payload.metadata || {},
    ],
  );
  return result.rows[0];
}

async function listMine(userId, { page, limit }) {
  const offset = (page - 1) * limit;
  const count = await query(`SELECT count(*)::int AS total FROM notifications WHERE recipient_id = $1`, [userId]);
  const result = await query(
    `SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return { rows: result.rows, total: count.rows[0].total };
}

async function markRead(userId, id) {
  const result = await query(
    `UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND recipient_id = $2 RETURNING *`,
    [id, userId],
  );
  return result.rows[0] || null;
}

async function markAllRead(userId) {
  await query(`UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE recipient_id = $1 AND read_at IS NULL`, [userId]);
}

module.exports = { createNotification, listMine, markRead, markAllRead };
