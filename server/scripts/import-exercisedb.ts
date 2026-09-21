// Script ho tro import exercisedb cho server.
import { env } from "../src/config/env";
import { withTransaction, closePool } from "../src/db/pool";
import type { PoolClient } from "pg";
interface ExerciseDbItem {
  id?: string | number;
  exerciseId?: string | number;
  external_id?: string | number;
  name?: string;
  gifUrl?: string;
  gif_url?: string;
  instructions?: string[];
  bodyPart?: string;
  body_part?: string;
  equipment?: string;
  target?: string;
  targetMuscle?: string;
  secondaryMuscles?: string[];
  secondary_muscles?: string[];
  [key: string]: unknown;
}
interface Page {
  items: ExerciseDbItem[];
  nextCursor: string | null;
  isLast: boolean;
}

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertTaxonomy(client: PoolClient, table: string, name: string | undefined) {
  if (!name) return null;
  const result = await client.query<{ id: string }>(
    `INSERT INTO ${table} (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [String(name).trim().toLowerCase()],
  );
  return result.rows[0].id;
}

async function importExercise(client: PoolClient, item: ExerciseDbItem): Promise<"created" | "updated"> {
  const externalId = item.id || item.exerciseId || item.external_id;
  if (!externalId || !item.name) throw new Error("Exercise payload is missing id/name");

  const result = await client.query<{ id: string; created: boolean }>(
    `INSERT INTO exercises (external_id, source, name, gif_url, instructions, status, raw_data)
     VALUES ($1, 'exercisedb_v1', $2, $3, $4, 'active', $5)
     ON CONFLICT (external_id) DO UPDATE SET
       name = EXCLUDED.name,
       gif_url = EXCLUDED.gif_url,
       instructions = EXCLUDED.instructions,
       raw_data = EXCLUDED.raw_data
     RETURNING id, xmax = 0 AS created`,
    [String(externalId), item.name, item.gifUrl || item.gif_url || null, JSON.stringify(item.instructions || []), item],
  );

  const exerciseId = result.rows[0].id;
  await client.query("DELETE FROM exercise_body_parts WHERE exercise_id = $1", [exerciseId]);
  await client.query("DELETE FROM exercise_equipments WHERE exercise_id = $1", [exerciseId]);
  await client.query("DELETE FROM exercise_muscles WHERE exercise_id = $1", [exerciseId]);

  const bodyPartId = await upsertTaxonomy(client, "body_parts", item.bodyPart || item.body_part);
  if (bodyPartId)
    await client.query("INSERT INTO exercise_body_parts VALUES ($1, $2) ON CONFLICT DO NOTHING", [
      exerciseId,
      bodyPartId,
    ]);

  const equipmentId = await upsertTaxonomy(client, "equipments", item.equipment);
  if (equipmentId)
    await client.query("INSERT INTO exercise_equipments VALUES ($1, $2) ON CONFLICT DO NOTHING", [
      exerciseId,
      equipmentId,
    ]);

  const targetId = await upsertTaxonomy(client, "muscles", item.target || item.targetMuscle);
  if (targetId)
    await client.query("INSERT INTO exercise_muscles VALUES ($1, $2, 'target') ON CONFLICT DO NOTHING", [
      exerciseId,
      targetId,
    ]);

  for (const muscle of item.secondaryMuscles || item.secondary_muscles || []) {
    const muscleId = await upsertTaxonomy(client, "muscles", muscle);
    if (muscleId)
      await client.query("INSERT INTO exercise_muscles VALUES ($1, $2, 'secondary') ON CONFLICT DO NOTHING", [
        exerciseId,
        muscleId,
      ]);
  }

  return result.rows[0].created ? "created" : "updated";
}

async function fetchPage(cursorOrPage: string | number) {
  const url = new URL(env.exercisedb.apiUrl || "");
  if (cursorOrPage) {
    if (typeof cursorOrPage === "number") url.searchParams.set("page", String(cursorOrPage));
    else url.searchParams.set("cursor", cursorOrPage);
  }
  const headers: Record<string, string> = {};
  if (env.exercisedb.apiKey) headers["x-rapidapi-key"] = env.exercisedb.apiKey;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`ExerciseDB request failed: ${response.status}`);
  return response.json();
}

function normalizeResponse(payload: unknown): Page {
  if (Array.isArray(payload)) return { items: payload, nextCursor: null, isLast: true };
  const data = payload as Record<string, unknown>;
  return {
    items: (data.items || data.data || data.results || []) as ExerciseDbItem[],
    nextCursor: (data.nextCursor || data.next_cursor || null) as string | null,
    isLast: !data.nextCursor && !data.next_cursor && !(data.hasNext || data.has_next),
  };
}

async function main() {
  if (!env.exercisedb.apiUrl) throw new Error("EXERCISEDB_API_URL is required");
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
  let cursor: string | null = null;
  let page = 1;
  let done = false;

  while (!done) {
    const payload = normalizeResponse(await fetchPage(cursor || page));
    for (const item of payload.items) {
      try {
        if (dryRun) {
          stats.skipped += 1;
        } else {
          const status = await withTransaction((client) => importExercise(client, item));
          stats[status] += 1;
        }
      } catch (error) {
        stats.failed += 1;
        console.error(
          `failed ${item.id || item.name || "unknown"}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    done = payload.isLast;
    cursor = payload.nextCursor;
    page += 1;
    if (!done) await sleep(env.exercisedb.delayMs);
  }

  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
