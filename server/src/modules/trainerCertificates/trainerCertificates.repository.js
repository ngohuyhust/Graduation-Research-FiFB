const { query } = require("../../db/pool");

async function create(trainerId, payload) {
  const result = await query(
    `INSERT INTO trainer_certificates (trainer_id, title, issuer, certificate_url, certificate_number, verification_url, issued_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [trainerId, payload.title, payload.issuer || null, payload.certificateUrl || null, payload.certificateNumber || null, payload.verificationUrl || null, payload.issuedAt || null, payload.expiresAt || null],
  );
  return result.rows[0];
}

async function listByTrainer(trainerId) {
  const result = await query("SELECT * FROM trainer_certificates WHERE trainer_id = $1 ORDER BY created_at DESC", [trainerId]);
  return result.rows;
}

async function listAll({ page, limit }) {
  const count = await query("SELECT count(*)::int AS total FROM trainer_certificates");
  const result = await query("SELECT * FROM trainer_certificates ORDER BY created_at DESC LIMIT $1 OFFSET $2", [limit, (page - 1) * limit]);
  return { rows: result.rows, total: count.rows[0].total };
}

async function findById(client, id) {
  const result = await client.query("SELECT * FROM trainer_certificates WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function setReviewStatus(client, id, actor, decision) {
  const result = await client.query(
    "UPDATE trainer_certificates SET status = $2, reviewed_by = $3, reviewed_at = now(), rejection_reason = $4 WHERE id = $1 RETURNING *",
    [id, decision.status, actor.userId, decision.rejectionReason || null],
  );
  return result.rows[0] || null;
}

module.exports = { create, listByTrainer, listAll, findById, setReviewStatus };
