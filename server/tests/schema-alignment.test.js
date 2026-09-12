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
});
