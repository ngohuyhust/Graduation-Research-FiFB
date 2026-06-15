const fs = require("fs");
const path = require("path");
const { pool } = require("../src/db/pool");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function migrate() {
  if (process.env.ALLOW_OPTIONAL_MIGRATION !== "true") {
    console.log("Migration skipped. Existing Supabase DB created from Document/DatabaseSQL.txt is the default setup.");
    console.log("For a fresh local database only, set ALLOW_OPTIONAL_MIGRATION=true before running this command.");
    return;
  }

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const dir = path.join(__dirname, "..", "migrations");
    const files = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const existing = await client.query("SELECT 1 FROM public.schema_migrations WHERE filename = $1", [file]);
      if (existing.rows[0]) {
        console.log(`skip ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO public.schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`applied ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
