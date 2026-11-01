import { addTaxonomyFilter } from "../src/modules/exercises/exercises.repository";

describe("exercise taxonomy query scope", () => {
  test.each(["target", "secondary"])("keeps the %s muscle role inside its EXISTS subquery", (role) => {
    const values: unknown[] = [];
    const clauses: string[] = [];
    addTaxonomyFilter(
      values,
      clauses,
      { page: 1, limit: 20, targetMuscle: "lats" },
      "exercise_muscles",
      { table: "muscles", fk: "muscle_id" },
      "targetMuscle",
      role,
    );
    expect(clauses).toEqual([
      `EXISTS (SELECT 1 FROM exercise_muscles x JOIN muscles n ON n.id = x.muscle_id WHERE x.exercise_id = e.id AND n.name ILIKE $1 AND x.muscle_role = '${role}')`,
    ]);
    expect(values).toEqual(["%lats%"]);
  });
});
