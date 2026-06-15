const fs = require("fs");
const path = require("path");

function listJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(fullPath);
    return entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

describe("database schema alignment", () => {
  test("backend SQL does not reference removed schema objects", () => {
    const files = [
      ...listJsFiles(path.join(__dirname, "..", "src")),
      ...listJsFiles(path.join(__dirname, "..", "scripts")),
    ];
    const forbiddenSqlObject =
      /\b(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+(?:public\.)?(?:users|profiles|auth\.users|exercise_instructions)\b/i;
    const offenders = files.filter((file) => forbiddenSqlObject.test(fs.readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
