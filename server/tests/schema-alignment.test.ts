// Kiem thu tu dong cho schema alignment.
const fs = require("fs");
const path = require("path");

function listSourceFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.[jt]s$/.test(entry.name) ? [fullPath] : [];
  });
}

describe("database schema alignment", () => {
  test("backend SQL does not reference removed schema objects", () => {
    const files = [
      ...listSourceFiles(path.join(__dirname, "..", "src")),
      ...listSourceFiles(path.join(__dirname, "..", "scripts")),
    ];
    const forbiddenSqlObject =
      /\b(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+(?:public\.)?(?:users|profiles|auth\.users|exercise_instructions)\b/i;
    const offenders = files.filter((file) => forbiddenSqlObject.test(fs.readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  test("documented v2 schema includes the runtime tables and indexes", () => {
    const schema = fs.readFileSync(
      path.join(__dirname, "..", "..", "Document", "DatabaseSQL-v2.txt"),
      "utf8",
    );

    for (const table of ["workout_sessions", "session_exercise_logs", "chat_messages"]) {
      expect(schema).toMatch(new RegExp(`CREATE TABLE public\\.${table}\\s*\\(`));
    }

    for (const index of [
      "idx_workout_sessions_user_started",
      "idx_session_exercise_logs_session_id",
      "idx_session_exercise_logs_exercise_id",
      "idx_chat_messages_connection_created",
      "idx_chat_messages_unread",
    ]) {
      expect(schema).toContain(`CREATE INDEX ${index}`);
    }
  });
});

export {};
