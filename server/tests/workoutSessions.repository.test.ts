import { WorkoutSessionsRepository } from "../src/modules/workoutSessions/workoutSessions.repository";
import { DatabaseService } from "../src/db/database.service";

describe("durable session repository", () => {
  const query = jest.fn();
  const db = { withTransaction: (fn) => fn({ query }), query } as unknown as DatabaseService;
  const repo = new WorkoutSessionsRepository(db);
  beforeEach(() => query.mockReset());
  test("session replay returns the existing row without writing or re-reading a changed plan", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: "session", same_request: true }] });
    expect(await repo.create("owner", { title: "Day", clientOperationId: "operation" })).toMatchObject({
      id: "session",
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][1]).toEqual([
      "owner",
      "operation",
      JSON.stringify({ title: "Day", clientOperationId: "operation" }),
    ]);
  });
  test("reuse with a different session payload conflicts", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ same_request: false }] });
    await expect(repo.create("owner", { title: "Other", clientOperationId: "operation" })).rejects.toMatchObject({
      status: 409,
    });
  });
  test("creation snapshots only the selected owned plan day", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: "plan" }] })
      .mockResolvedValueOnce({ rows: [{ exercise_id: "exercise", day_number: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: "session" }] });
    await repo.create("owner", { title: "Day", workoutPlanId: "plan", dayNumber: 2 });
    expect(query.mock.calls[0][0]).toContain("owner_id = $2");
    expect(query.mock.calls[1][1]).toEqual(["plan", 2]);
    expect(JSON.parse(query.mock.calls[2][1][6])).toEqual([{ exercise_id: "exercise", day_number: 2 }]);
  });
  test("replaying a deleted set after completion cannot resurrect it", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ completed_at: "now" }] })
      .mockResolvedValueOnce({ rows: [{ id: "set", deleted_at: "now", same_request: true }] });
    expect(
      await repo.addLog("owner", "session", {
        exerciseId: "exercise",
        setNumber: 1,
        actualReps: 8,
        clientOperationId: "operation",
      }),
    ).toMatchObject({ id: "set", deleted_at: "now" });
    expect(query).toHaveBeenCalledTimes(2);
  });
  test("new sets and edits are rejected for unowned or finished sessions", async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await repo.addLog("other", "session", { exerciseId: "exercise", setNumber: 1, actualReps: 8 })).toBeNull();
    expect(await repo.changeLog("other", "session", "set")).toBeNull();
    expect(query.mock.calls.every(([sql]) => sql.startsWith("SELECT"))).toBe(true);
  });
});
