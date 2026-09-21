jest.mock("pg", () => ({ Pool: jest.fn().mockImplementation(() => ({ connect: jest.fn(), query: jest.fn() })) }));
const request = require("supertest");
const { createApp } = require("../src/app");
const { pool } = require("../src/db/pool");
const { UsersRepository } = require("../src/modules/users/users.repository");
const { signAccessToken } = new (require("../src/modules/auth/jwt.service").JwtService)();
const userId = "d44b9038-7685-40c5-bb65-c075584c83ac";
const id = "b18cfd54-c056-4c53-b5c0-4e7890f7521d";

describe("Nest workout plans with real repository and transaction handling", () => {
  let app, client, actor, owned, active, queries;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.locals.nest.close();
  });
  beforeEach(() => {
    queries = [];
    owned = true;
    active = true;
    actor = { id: userId, role: "user", status: "active", email_verified_at: "2026-01-01" };
    jest.spyOn(app.locals.nest.get(UsersRepository), "findById").mockImplementation(async () => actor);
    const query = jest.fn(async (sql, params) => {
      queries.push([sql, params]);
      if (/count\(\*\)/.test(sql)) return { rows: [{ total: 1 }] };
      if (/SELECT id FROM exercises/.test(sql)) return { rows: active ? [{}] : [] };
      if (/WHERE id = \$1 AND owner_id/.test(sql) && !owned) return { rows: [] };
      if (/workout_plan_items/.test(sql)) return { rows: [] };
      return { rows: [{ id, owner_id: userId, title: "Push" }] };
    });
    client = { query, release: jest.fn() };
    pool.connect.mockResolvedValue(client);
    pool.query.mockImplementation(query);
  });
  afterEach(() => jest.restoreAllMocks());
  const auth = (actor) => `Bearer ${signAccessToken(actor)}`;
  test("create parses defaults, enforces active exercises and commits items with plan", async () => {
    const response = await request(app)
      .post("/api/workout-plans")
      .set("Authorization", auth(actor))
      .send({ title: " Push ", items: [{ exerciseId: id, restSeconds: 0 }] })
      .expect(201);
    expect(response.body).toMatchObject({
      success: true,
      message: "Workout plan created",
      data: { plan: { id, items: [] } },
    });
    expect(queries[0][0]).toBe("BEGIN");
    expect(queries.at(-1)[0]).toBe("COMMIT");
    expect(queries.find(([sql]) => sql.startsWith("INSERT INTO workout_plans"))[1]).toEqual([
      userId,
      "Push",
      null,
      "private",
    ]);
    expect(queries.find(([sql]) => sql.startsWith("INSERT INTO workout_plan_items"))[1]).toEqual([
      id,
      id,
      1,
      1,
      null,
      null,
      null,
      0,
      null,
    ]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
  test.each(["inactive", "duplicate"])("%s exercise items roll back the whole transaction", async (state) => {
    active = state !== "inactive";
    const item = { exerciseId: id, dayNumber: 1, sortOrder: 1 };
    await request(app)
      .post("/api/workout-plans")
      .set("Authorization", auth(actor))
      .send({ title: "Push", items: state === "duplicate" ? [item, item] : [item] })
      .expect(state === "duplicate" ? 409 : 400);
    expect(queries.at(-1)[0]).toBe("ROLLBACK");
    expect(queries.some(([sql]) => sql === "COMMIT")).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
  test("list is scoped to owner and archive retains 200 response", async () => {
    await request(app).get("/api/workout-plans?page=2&limit=5").set("Authorization", auth(actor)).expect(200);
    expect(queries.at(-1)[1]).toEqual([userId, 5, 5]);
    const response = await request(app)
      .delete(`/api/workout-plans/${id}`)
      .set("Authorization", auth(actor))
      .expect(200);
    expect(response.body.message).toBe("Workout plan archived");
    expect(queries.at(-1)[1]).toEqual([id, userId]);
  });
  test("updating items uses one transaction and allows clearing all items", async () => {
    await request(app)
      .patch(`/api/workout-plans/${id}`)
      .set("Authorization", auth(actor))
      .send({ items: [] })
      .expect(200);
    expect(queries.some(([sql]) => sql.startsWith("DELETE FROM workout_plan_items"))).toBe(true);
    expect(queries.at(-1)[0]).toBe("COMMIT");
  });
  test.each(["get", "patch", "delete"])("%s rejects a plan owned by another user", async (method) => {
    owned = false;
    await request(app)
      [method](`/api/workout-plans/${id}`)
      .set("Authorization", auth(actor))
      .send(method === "patch" ? { title: "Changed" } : undefined)
      .expect(404);
    if (method === "patch") expect(queries.at(-1)[0]).toBe("ROLLBACK");
  });
  test("guards and validation run before business queries; admin remains allowed", async () => {
    await request(app).get("/api/workout-plans").expect(401);
    actor.status = "locked";
    await request(app).get("/api/workout-plans").set("Authorization", auth(actor)).expect(403);
    actor.status = "active";
    actor.email_verified_at = null;
    await request(app).get("/api/workout-plans").set("Authorization", auth(actor)).expect(403);
    actor.email_verified_at = "2026-01-01";
    actor.role = "admin";
    await request(app).get("/api/workout-plans/bad").set("Authorization", auth(actor)).expect(400);
    expect(queries).toEqual([]);
    await request(app).get("/api/workout-plans").set("Authorization", auth(actor)).expect(200);
  });
});

export {};
