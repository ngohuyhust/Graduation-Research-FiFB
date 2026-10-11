import { spawnSync } from "node:child_process";
import { connectionEnvironment, FLYWAY_IMAGE, runFlyway } from "../scripts/flyway";

jest.mock("node:child_process", () => ({ spawnSync: jest.fn() }));
jest.mock("dotenv", () => ({ config: jest.fn() }));

describe("Flyway connection configuration", () => {
  test("decodes credentials separately and maps a local database into Docker", () => {
    const environment = connectionEnvironment(
      { DATABASE_URL: "postgresql://some%40user:p%40ss%3Aword@localhost:5432/fifb", DB_SSL: "false" },
      true,
    );
    expect(environment).toEqual({
      FLYWAY_URL: "jdbc:postgresql://host.docker.internal:5432/fifb?sslmode=disable",
      FLYWAY_USER: "some@user",
      FLYWAY_PASSWORD: "p@ss:word",
    });
  });

  test("prefers the migration connection and preserves explicit SSL settings", () => {
    expect(
      connectionEnvironment(
        {
          DATABASE_URL: "postgres://api:secret@aws-0-example.pooler.supabase.com:6543/postgres",
          MIGRATION_DATABASE_URL: "postgres://migrator:secret@db.example.com:5432/postgres?sslmode=verify-full",
          DB_SSL: "true",
        },
        false,
      ),
    ).toEqual({
      FLYWAY_URL: "jdbc:postgresql://db.example.com:5432/postgres?sslmode=verify-full",
      FLYWAY_USER: "migrator",
      FLYWAY_PASSWORD: "secret",
    });
  });

  test("uses SSL for remote databases when DB_SSL is enabled", () => {
    expect(
      connectionEnvironment({ DATABASE_URL: "postgres://u:p@db.example.com/db", DB_SSL: "true" }, true).FLYWAY_URL,
    ).toBe("jdbc:postgresql://db.example.com/db?sslmode=require");
  });

  test("rejects Supabase transaction connections before launching Flyway", () => {
    expect(() =>
      connectionEnvironment({ DATABASE_URL: "postgres://u:p@aws-0-example.pooler.supabase.com:6543/postgres" }, true),
    ).toThrow("direct or session connection");
  });

  test.each([undefined, "not a URL", "mysql://u:p@localhost/db", "postgres://u:p@localhost"])(
    "rejects missing or invalid connections without printing credentials: %s",
    (connectionString) => {
      expect(() => connectionEnvironment({ DATABASE_URL: connectionString }, true)).toThrow();
    },
  );
});

describe("Flyway runner", () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = { DATABASE_URL: "postgres://u:sensitive@localhost:5432/test", FLYWAY_CLEAN_DISABLED: "false" };
    jest.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<typeof spawnSync>);
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.env = originalEnvironment;
    process.exitCode = undefined;
  });

  test("passes credentials via environment and uses the pinned image", () => {
    runFlyway("migrate", ["info"]);
    const [executable, args, options] = jest.mocked(spawnSync).mock.calls[0];
    expect(executable).toBe("docker");
    expect(args).toContain(FLYWAY_IMAGE);
    expect(args?.at(-1)).toBe("info");
    expect(args?.join(" ")).not.toContain("sensitive");
    expect(options?.env?.FLYWAY_PASSWORD).toBe("sensitive");
    expect(options?.env?.FLYWAY_CLEAN_DISABLED).toBeUndefined();
    expect(options?.shell).toBe(false);
  });

  test("propagates a Flyway failure to the calling command", () => {
    jest.mocked(spawnSync).mockReturnValue({ status: 7 } as ReturnType<typeof spawnSync>);
    runFlyway("migrate", []);
    expect(process.exitCode).toBe(7);
  });

  test.each([["clean"], ["-baselineOnMigrate=true"], ["-url=jdbc:postgresql://other/db"], ["-cleanDisabled=false"]])(
    "rejects unsafe command overrides %s",
    (...args) => {
      expect(() => runFlyway("migrate", args)).toThrow();
      expect(spawnSync).not.toHaveBeenCalled();
    },
  );
});
