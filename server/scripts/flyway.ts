import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

export const FLYWAY_IMAGE = "redgate/flyway:13.10.0";
const commands = new Set(["migrate", "info", "validate", "baseline", "repair"]);

export function migrationSchema(source: NodeJS.ProcessEnv): string {
  const schema = source.MIGRATION_SCHEMA?.trim() || "public";
  if (
    !/^[a-z_][a-z0-9_]{0,62}$/.test(schema) ||
    schema.startsWith("pg_") ||
    ["information_schema", "auth", "storage", "extensions"].includes(schema)
  ) {
    throw new Error("MIGRATION_SCHEMA must be a lowercase PostgreSQL schema name, such as public or fifb_test.");
  }
  return schema;
}

export function connectionEnvironment(source: NodeJS.ProcessEnv, docker: boolean): NodeJS.ProcessEnv {
  const connectionString = source.MIGRATION_DATABASE_URL || source.DATABASE_URL;
  if (!connectionString) throw new Error("Set MIGRATION_DATABASE_URL or DATABASE_URL before running Flyway.");

  let url: URL;
  try {
    url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
      throw new Error();
    }
  } catch {
    throw new Error("The migration connection must be a valid PostgreSQL URL with a database name.");
  }
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543") {
    throw new Error("Use a Supabase direct or session connection (port 5432) in MIGRATION_DATABASE_URL for Flyway.");
  }

  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  url.username = "";
  url.password = "";
  if (docker && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    url.hostname = "host.docker.internal";
  }
  // pg's ssl flag is not a JDBC option; translate the application's SSL default.
  if (url.searchParams.get("sslmode") === "no-verify") url.searchParams.set("sslmode", "require");
  if (!url.searchParams.has("sslmode") && !url.searchParams.has("ssl")) {
    const ssl = ["true", "1", "yes", "on"].includes((source.DB_SSL || "").toLowerCase());
    url.searchParams.set("sslmode", ssl ? "require" : "disable");
  }
  return {
    FLYWAY_URL: `jdbc:postgresql://${url.host}${url.pathname}${url.search}`,
    FLYWAY_USER: user,
    FLYWAY_PASSWORD: password,
  };
}

export function runFlyway(defaultCommand = "migrate", args = process.argv.slice(2)): void {
  // These entry points run from dist/scripts after npm run build.
  const serverRoot = path.resolve(__dirname, path.basename(path.dirname(__dirname)) === "dist" ? "../.." : "..");
  dotenv.config({ path: path.join(serverRoot, ".env") });
  const schema = migrationSchema(process.env);
  const command = commands.has(args[0]) ? args.shift()! : defaultCommand;
  if (!commands.has(command)) throw new Error(`Unsupported Flyway command: ${command}`);
  if (args.includes("--dry-run")) {
    if (command !== "migrate" || args.length !== 1)
      throw new Error("--dry-run cannot be combined with Flyway options.");
    const directory = path.join(serverRoot, "flyway", "sql");
    for (const file of readdirSync(directory)
      .filter((file) => /^V\d+__.*\.sql$/.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      const sql = readFileSync(path.join(directory, file), "utf8").replaceAll("${flyway:defaultSchema}", schema);
      console.log(`-- ${file}\n${sql}`);
    }
    console.log("-- SQL preview only; this does not inspect pending migrations. Use migrate:info to inspect history.");
    return;
  }
  if (
    args.some(
      (arg) =>
        !arg.startsWith("-") ||
        /^-(?:flyway\.)?(?:configFiles|url|user|password|cleanDisabled|baselineOnMigrate|locations|schemas|defaultSchema|table|placeholderReplacement|placeholders\.[^=]+)=/i.test(
          arg,
        ),
    )
  ) {
    throw new Error(
      "Pass Flyway options only; connection and schema settings are managed by the project configuration.",
    );
  }

  const docker = !process.env.FLYWAY_EXECUTABLE;
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("FLYWAY_")));
  Object.assign(environment, connectionEnvironment(process.env, docker));
  Object.assign(environment, { FLYWAY_SCHEMAS: schema, FLYWAY_DEFAULT_SCHEMA: schema });
  const executable = process.env.FLYWAY_EXECUTABLE || "docker";
  const configDirectory = path.join(serverRoot, "flyway");
  const childArgs = docker
    ? [
        "run",
        "--rm",
        "--add-host=host.docker.internal:host-gateway",
        "--volume",
        `${configDirectory}:/flyway/project:ro`,
        "--env",
        "FLYWAY_URL",
        "--env",
        "FLYWAY_USER",
        "--env",
        "FLYWAY_PASSWORD",
        "--env",
        "FLYWAY_SCHEMAS",
        "--env",
        "FLYWAY_DEFAULT_SCHEMA",
        FLYWAY_IMAGE,
        "-configFiles=/flyway/project/flyway.conf",
        "-locations=filesystem:/flyway/project/sql",
      ]
    : [
        `-configFiles=${path.join(configDirectory, "flyway.conf")}`,
        `-locations=filesystem:${path.join(configDirectory, "sql")}`,
      ];
  const result = spawnSync(executable, [...childArgs, ...args, command], {
    cwd: serverRoot,
    env: environment,
    stdio: "inherit",
    shell: false,
  });
  if (result.error)
    throw new Error(
      `Could not start ${executable}. Start Docker Desktop or set FLYWAY_EXECUTABLE to a Flyway CLI executable.`,
    );
  process.exitCode = result.status ?? 1;
}

if (require.main === module) {
  try {
    runFlyway();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Flyway failed.");
    process.exitCode = 1;
  }
}
