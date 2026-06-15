const { query } = require("../../db/pool");

const tables = {
  bodyParts: "body_parts",
  equipments: "equipments",
  muscles: "muscles",
};

function resolveTable(kind) {
  return tables[kind];
}

async function list(kind) {
  const table = resolveTable(kind);
  const result = await query(`SELECT * FROM ${table} ORDER BY name ASC`);
  return result.rows;
}

async function create(kind, name) {
  const table = resolveTable(kind);
  const result = await query(
    `INSERT INTO ${table} (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
    [name],
  );
  return result.rows[0];
}

module.exports = { list, create, resolveTable };
