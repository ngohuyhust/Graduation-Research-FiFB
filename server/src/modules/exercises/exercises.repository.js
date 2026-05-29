const { query } = require("../../db/pool");

function pageOffset({ page, limit }) {
  return (page - 1) * limit;
}

function exerciseLibrarySelect(alias = "e") {
  return `
    ${alias}.*,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', bp.id, 'name', bp.name) ORDER BY bp.name)
      FROM exercise_body_parts ebp JOIN body_parts bp ON bp.id = ebp.body_part_id
      WHERE ebp.exercise_id = ${alias}.id), '[]'::jsonb) AS body_parts,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', eq.id, 'name', eq.name) ORDER BY eq.name)
      FROM exercise_equipments ee JOIN equipments eq ON eq.id = ee.equipment_id
      WHERE ee.exercise_id = ${alias}.id), '[]'::jsonb) AS equipments,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name) ORDER BY m.name)
      FROM exercise_muscles em JOIN muscles m ON m.id = em.muscle_id
      WHERE em.exercise_id = ${alias}.id AND em.muscle_role = 'target'), '[]'::jsonb) AS target_muscles,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name) ORDER BY m.name)
      FROM exercise_muscles em JOIN muscles m ON m.id = em.muscle_id
      WHERE em.exercise_id = ${alias}.id AND em.muscle_role = 'secondary'), '[]'::jsonb) AS secondary_muscles
  `;
}

function camelExercise(row) {
  if (!row) return null;
  return {
    id: row.id,
    externalId: row.external_id,
    source: row.source,
    name: row.name,
    gifUrl: row.gif_url,
    instructions: row.instructions || [],
    status: row.status,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    bodyParts: row.body_parts || [],
    equipments: row.equipments || [],
    targetMuscles: row.target_muscles || [],
    secondaryMuscles: row.secondary_muscles || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function addTaxonomyFilter(values, clauses, filters, table, nameColumn, alias, role) {
  values.push(`%${filters[alias]}%`);
  let sql = `EXISTS (SELECT 1 FROM ${table} x JOIN ${nameColumn.table} n ON n.id = x.${nameColumn.fk} WHERE x.exercise_id = e.id AND n.name ILIKE $${values.length})`;
  if (role) sql += ` AND x.muscle_role = '${role}'`;
  clauses.push(sql);
}

async function list(filters, admin = false) {
  const values = [];
  const clauses = [admin && filters.status ? "e.status = $" + values.push(filters.status) : admin ? "1=1" : "e.status = 'active'"];
  if (filters.keyword) {
    values.push(`%${filters.keyword}%`);
    clauses.push(`e.name ILIKE $${values.length}`);
  }
  if (filters.bodyPart) addTaxonomyFilter(values, clauses, filters, "exercise_body_parts", { table: "body_parts", fk: "body_part_id" }, "bodyPart");
  if (filters.equipment) addTaxonomyFilter(values, clauses, filters, "exercise_equipments", { table: "equipments", fk: "equipment_id" }, "equipment");
  if (filters.targetMuscle) addTaxonomyFilter(values, clauses, filters, "exercise_muscles", { table: "muscles", fk: "muscle_id" }, "targetMuscle", "target");
  if (filters.secondaryMuscle) addTaxonomyFilter(values, clauses, filters, "exercise_muscles", { table: "muscles", fk: "muscle_id" }, "secondaryMuscle", "secondary");

  const where = clauses.join(" AND ");
  const count = await query(`SELECT count(*)::int AS total FROM exercises e WHERE ${where}`, values);
  const result = await query(
    `SELECT ${exerciseLibrarySelect("e")}
     FROM exercises e
     WHERE ${where}
     ORDER BY e.name ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, filters.limit, pageOffset(filters)],
  );
  return { rows: result.rows.map(camelExercise), total: count.rows[0].total };
}

async function findActiveById(id) {
  const result = await query(`SELECT ${exerciseLibrarySelect("e")} FROM exercises e WHERE e.id = $1 AND e.status = 'active'`, [id]);
  return camelExercise(result.rows[0]);
}

async function findById(client, id) {
  const result = await client.query("SELECT * FROM exercises WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function ensureActive(client, id) {
  const result = await client.query("SELECT id FROM exercises WHERE id = $1 AND status = 'active'", [id]);
  return Boolean(result.rows[0]);
}

async function create(client, actor, payload, source) {
  const status = source === "trainer_submission" ? "pending" : payload.status || "active";
  const result = await client.query(
    `INSERT INTO exercises (external_id, source, name, gif_url, instructions, status, created_by, raw_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      payload.externalId || null,
      source,
      payload.name,
      payload.gifUrl || null,
      JSON.stringify(payload.instructions || []),
      status,
      actor.userId,
      payload.rawData || { submittedVia: "api" },
    ],
  );
  return result.rows[0];
}

async function update(client, id, payload) {
  const result = await client.query(
    `UPDATE exercises
     SET external_id = COALESCE($2, external_id), name = COALESCE($3, name), gif_url = COALESCE($4, gif_url),
         instructions = COALESCE($5, instructions),
         status = COALESCE($6, status),
         raw_data = COALESCE($7, raw_data),
         updated_at = now()
     WHERE id = $1 RETURNING *`,
    [
      id,
      payload.externalId,
      payload.name,
      payload.gifUrl,
      payload.instructions ? JSON.stringify(payload.instructions) : null,
      payload.status,
      payload.rawData || null,
    ],
  );
  return result.rows[0] || null;
}

async function setReviewStatus(client, id, actor, status, rejectionReason) {
  const result = await client.query(
    `UPDATE exercises
     SET status = $2,
         reviewed_by = $3,
         reviewed_at = now(),
         rejection_reason = CASE WHEN $2 = 'rejected' THEN $4 ELSE NULL END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, status, actor.userId, rejectionReason || null],
  );
  return result.rows[0] || null;
}

async function replaceMappings(client, exerciseId, payload) {
  await client.query("DELETE FROM exercise_body_parts WHERE exercise_id = $1", [exerciseId]);
  await client.query("DELETE FROM exercise_equipments WHERE exercise_id = $1", [exerciseId]);
  await client.query("DELETE FROM exercise_muscles WHERE exercise_id = $1", [exerciseId]);
  for (const id of payload.bodyPartIds || []) await client.query("INSERT INTO exercise_body_parts VALUES ($1, $2) ON CONFLICT DO NOTHING", [exerciseId, id]);
  for (const id of payload.equipmentIds || []) await client.query("INSERT INTO exercise_equipments VALUES ($1, $2) ON CONFLICT DO NOTHING", [exerciseId, id]);
  for (const id of payload.targetMuscleIds || []) await client.query("INSERT INTO exercise_muscles VALUES ($1, $2, 'target') ON CONFLICT DO NOTHING", [exerciseId, id]);
  for (const id of payload.secondaryMuscleIds || []) await client.query("INSERT INTO exercise_muscles VALUES ($1, $2, 'secondary') ON CONFLICT DO NOTHING", [exerciseId, id]);
}

module.exports = { list, findActiveById, findById, ensureActive, create, update, setReviewStatus, replaceMappings, exerciseLibrarySelect, camelExercise };
