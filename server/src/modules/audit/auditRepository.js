const { query } = require("../../db/pool");

async function createAudit(client, payload) {
  const runner = client || { query };
  await runner.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      payload.actorId || null,
      payload.action,
      payload.entityType,
      payload.entityId ? String(payload.entityId) : null,
      payload.oldValues || null,
      payload.newValues || null,
      payload.ipAddress || null,
      payload.userAgent || null,
    ],
  );
}

async function listAuditLogs({ page, limit, action, entityType, actorId }) {
  const offset = (page - 1) * limit;
  const filters = ["1 = 1"];
  const values = [];
  if (action) {
    values.push(action);
    filters.push(`action = $${values.length}`);
  }
  if (entityType) {
    values.push(entityType);
    filters.push(`entity_type = $${values.length}`);
  }
  if (actorId) {
    values.push(actorId);
    filters.push(`actor_id = $${values.length}`);
  }
  const where = filters.join(" AND ");
  const count = await query(`SELECT count(*)::int AS total FROM audit_logs WHERE ${where}`, values);
  const result = await query(
    `SELECT a.*, u.email AS actor_email
     FROM audit_logs a LEFT JOIN app_users u ON u.id = a.actor_id
     WHERE ${where}
     ORDER BY a.created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );
  return { rows: result.rows, total: count.rows[0].total };
}

module.exports = { createAudit, listAuditLogs };
