const request = require("supertest");
const { createApp } = require("../src/app");
const { UsersRepository } = require("../src/modules/users/users.repository");
const { FavoritesRepository } = require("../src/modules/favorites/favorites.repository");
const { DatabaseService } = require("../src/db/database.service");
const { signAccessToken } = new (require("../src/modules/auth/jwt.service").JwtService)();
const exerciseRepository = require("../src/modules/exercises/exercises.repository");
const userId = "d44b9038-7685-40c5-bb65-c075584c83ac";
const exerciseId = "b18cfd54-c056-4c53-b5c0-4e7890f7521d";

describe("Nest favorites", () => {
  let app, repository, actor;
  beforeAll(async () => { app = await createApp(); repository = app.locals.nest.get(FavoritesRepository); });
  afterAll(async () => { await app.locals.nest.close(); });
  beforeEach(() => {
    actor = { id: userId, role: "user", status: "active", email_verified_at: "2026-01-01" };
    jest.spyOn(app.locals.nest.get(UsersRepository), "findById").mockImplementation(async () => actor);
    jest.spyOn(app.locals.nest.get(DatabaseService), "withTransaction").mockImplementation((cb) => cb({ query: jest.fn() }));
    jest.spyOn(exerciseRepository, "ensureActive").mockResolvedValue(true);
    jest.spyOn(repository, "list").mockResolvedValue({ rows: [{ id: exerciseId }], total: 1 });
    jest.spyOn(repository, "add").mockResolvedValue({ user_id: userId, exercise_id: exerciseId });
    jest.spyOn(repository, "remove").mockResolvedValue(undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  const token = (actor) => `Bearer ${signAccessToken(actor)}`;
  test("list, idempotent add and delete preserve identity and response contract", async () => {
    const list = await request(app).get("/api/favorites?page=2&limit=5").set("Authorization", token(actor)).expect(200);
    expect(repository.list).toHaveBeenCalledWith(userId, { page: 2, limit: 5 });
    expect(list.body.data).toEqual({ items: [{ id: exerciseId }], page: 2, limit: 5, total: 1, totalPages: 1 });
    for (let i = 0; i < 2; i++) {
      const added = await request(app).post("/api/favorites").set("Authorization", token(actor)).send({ exerciseId, userId: exerciseId }).expect(201);
      expect(added.body).toEqual({ success: true, data: { favorite: { user_id: userId, exercise_id: exerciseId } }, message: "Favorite added" });
    }
    expect(repository.add).toHaveBeenCalledWith(expect.anything(), userId, exerciseId);
    const deleted = await request(app).delete(`/api/favorites/${exerciseId}`).set("Authorization", token(actor)).expect(204);
    expect(deleted.text).toBe("");
    expect(repository.remove).toHaveBeenCalledWith(userId, exerciseId);
  });
  test("inactive exercise and invalid inputs do not insert", async () => {
    await request(app).post("/api/favorites").set("Authorization", token(actor)).send({ exerciseId: "bad" }).expect(400);
    exerciseRepository.ensureActive.mockResolvedValue(false);
    await request(app).post("/api/favorites").set("Authorization", token(actor)).send({ exerciseId }).expect(400);
    await request(app).get("/api/favorites?limit=101").set("Authorization", token(actor)).expect(400);
    await request(app).delete("/api/favorites/bad").set("Authorization", token(actor)).expect(400);
    expect(repository.add).not.toHaveBeenCalled();
  });
  test.each(["get", "post", "delete"])("%s retains account and role guards", async (method) => {
    const path = method === "delete" ? `/api/favorites/${exerciseId}` : "/api/favorites";
    await request(app)[method](path).expect(401);
    actor.status = "locked";
    await request(app)[method](path).set("Authorization", token(actor)).expect(403);
    actor.status = "active"; actor.email_verified_at = null;
    await request(app)[method](path).set("Authorization", token(actor)).expect(403);
    actor.email_verified_at = "2026-01-01"; actor.role = "admin";
    await request(app)[method](path).set("Authorization", token(actor)).expect(403);
  });
});
