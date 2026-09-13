const request = require("supertest");

jest.mock("../src/db/pool", () => ({ withTransaction: (callback) => callback({ query: jest.fn() }) }));
jest.mock("../src/modules/exercises/exercises.repository", () => ({
  list: jest.fn(),
  findActiveById: jest.fn(),
  create: jest.fn(),
  replaceMappings: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  setReviewStatus: jest.fn(),
}));
jest.mock("../src/modules/auth/jwt.service", () => ({ verifyAccessToken: jest.fn() }));
jest.mock("../src/modules/audit/audit.repository", () => {
  const actual = jest.requireActual("../src/modules/audit/audit.repository");
  const createAudit = jest.fn();
  class AuditRepository extends actual.AuditRepository {
    createAudit(...args) { return createAudit(...args); }
  }
  return { ...actual, AuditRepository, createAudit };
});
jest.mock("../src/modules/notifications/notifications.repository", () => {
  const actual = jest.requireActual("../src/modules/notifications/notifications.repository");
  const createNotification = jest.fn();
  class NotificationsRepository extends actual.NotificationsRepository {
    createNotification(...args) { return createNotification(...args); }
  }
  return { ...actual, NotificationsRepository, createNotification };
});
jest.mock("../src/redis/client", () => ({ getRedisClient: jest.fn() }));
jest.mock("../src/utils/cache", () => ({ invalidateByPrefix: jest.fn() }));

const { createApp } = require("../src/app");
const { ExercisesService } = require("../src/modules/exercises/exercises.service");
const repository = require("../src/modules/exercises/exercises.repository");
const { UsersRepository } = require("../src/modules/users/users.repository");
const users = UsersRepository.prototype;
const jwt = require("../src/modules/auth/jwt.service");
const { createAudit } = require("../src/modules/audit/audit.repository");
const { createNotification } = require("../src/modules/notifications/notifications.repository");
const { getRedisClient } = require("../src/redis/client");
const { invalidateByPrefix } = require("../src/utils/cache");
const id = "6ce85d13-eec0-4aa3-9b8f-905fa1fcd8fb";

function login(role = "admin", overrides = {}) {
  jwt.verifyAccessToken.mockReturnValue({ sub: "actor" });
  users.findById.mockResolvedValue({
    id: "actor",
    role,
    status: "active",
    email_verified_at: "2026-01-01",
    ...overrides,
  });
}

describe("Nest exercise HTTP contract", () => {
  let app;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.locals.nest.close();
  });
  beforeEach(() => {
    jest.spyOn(users, "findById");
    jest.resetAllMocks();
    getRedisClient.mockResolvedValue(null);
    repository.list.mockResolvedValue({ rows: [{ id, name: "Push up" }], total: 1 });
  });

  test("module resolves service and public list preserves filters and pagination", async () => {
    expect(app.locals.nest.get(ExercisesService)).toBeInstanceOf(ExercisesService);
    const response = await request(app).get("/api/exercises?keyword=%20Push%20&page=2&limit=5").expect(200);
    expect(repository.list).toHaveBeenCalledWith({ keyword: "Push", page: 2, limit: 5 }, false);
    expect(response.body).toEqual({
      success: true,
      data: {
        items: [{ id, name: "Push up" }],
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      },
      message: "OK",
    });
  });

  test("invalid query and ID preserve validation envelope", async () => {
    for (const path of ["/api/exercises?limit=101", "/api/exercises/not-a-uuid"]) {
      const response = await request(app).get(path).set("X-Request-Id", "bad-input").expect(400);
      expect(response.body).toMatchObject({
        success: false,
        error: { code: "VALIDATION_ERROR" },
        requestId: "bad-input",
      });
    }
    const response = await request(app).get("/api/exercises/bad-id").expect(400);
    expect(response.body.error.details.fieldErrors.id).toBeDefined();
    expect(repository.list).not.toHaveBeenCalled();
  });

  test("detail returns exercise or standard 404", async () => {
    repository.findActiveById.mockResolvedValueOnce({ id }).mockResolvedValueOnce(null);
    const found = await request(app).get(`/api/exercises/${id}`).expect(200);
    expect(found.body.data).toEqual({ exercise: { id } });
    const missing = await request(app).get(`/api/exercises/${id}`).expect(404);
    expect(missing.body.error).toMatchObject({ code: "NOT_FOUND", message: "Exercise not found" });
  });

  test("writes enforce token, role, active status and verified email", async () => {
    await request(app).post("/api/exercises").send({ name: "Push up" }).expect(401);
    jwt.verifyAccessToken.mockImplementationOnce(() => {
      throw new Error("expired");
    });
    await request(app)
      .post("/api/exercises")
      .set("Authorization", "Bearer expired")
      .send({ name: "Push up" })
      .expect(401);
    for (const [role, overrides] of [
      ["user", {}],
      ["trainer", { status: "locked" }],
      ["admin", { email_verified_at: null }],
    ]) {
      login(role, overrides);
      await request(app)
        .post("/api/exercises")
        .set("Authorization", "Bearer token")
        .send({ name: "Push up" })
        .expect(403);
    }
    login("trainer");
    await request(app)
      .patch(`/api/exercises/${id}`)
      .set("Authorization", "Bearer token")
      .send({ name: "Push up" })
      .expect(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  test.each([
    ["trainer", "trainer_submission"],
    ["admin", "admin"],
  ])("%s creation keeps source and response", async (role, source) => {
    login(role);
    repository.create.mockResolvedValue({ id });
    const response = await request(app)
      .post("/api/exercises")
      .set("Authorization", "Bearer token")
      .send({ name: " Push up " })
      .expect(201);
    expect(repository.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ role }),
      expect.objectContaining({ name: "Push up", instructions: [] }),
      source,
    );
    expect(repository.replaceMappings).toHaveBeenCalledWith(
      expect.anything(),
      id,
      expect.objectContaining({ bodyPartIds: [] }),
    );
    expect(response.body).toEqual({ success: true, data: { exercise: { id } }, message: "Exercise created" });
    expect(invalidateByPrefix).toHaveBeenCalledWith("exercises:");
  });

  test("invalid body never reaches a write", async () => {
    login();
    await request(app).post("/api/exercises").set("Authorization", "Bearer token").send({ name: " " }).expect(400);
    expect(repository.create).not.toHaveBeenCalled();
  });

  test("admin update keeps omitted mappings and writes audit", async () => {
    login();
    repository.findById.mockResolvedValue({ id, name: "Old" });
    repository.update.mockResolvedValue({ id, name: "New" });
    const response = await request(app)
      .patch(`/api/exercises/${id}`)
      .set("Authorization", "Bearer token")
      .send({ name: "New" })
      .expect(200);
    expect(response.body.message).toBe("Exercise updated");
    expect(repository.replaceMappings).not.toHaveBeenCalled();
    expect(createAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "exercise.update", entityId: id }),
    );
    expect(invalidateByPrefix).toHaveBeenCalledWith("exercises:");
  });

  test("admin list/review/deactivate routes use the Nest service", async () => {
    login();
    await request(app).get("/api/admin/exercises?status=pending").set("Authorization", "Bearer token").expect(200);
    expect(repository.list).toHaveBeenCalledWith({ status: "pending", page: 1, limit: 20 }, true);
    repository.findById.mockResolvedValue({ id, status: "pending", created_by: "trainer" });
    repository.setReviewStatus.mockResolvedValue({ id, status: "active" });
    const reviewed = await request(app)
      .patch(`/api/admin/exercises/${id}/review`)
      .set("Authorization", "Bearer token")
      .set("User-Agent", "migration-test")
      .send({ status: "approved" })
      .expect(200);
    expect(reviewed.body.message).toBe("Exercise reviewed");
    expect(createNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ recipientId: "trainer", type: "exercise_active" }),
    );
    expect(createAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userAgent: "migration-test", action: "exercise.active" }),
    );
    repository.update.mockResolvedValue({ id, status: "inactive" });
    const deactivated = await request(app)
      .patch(`/api/admin/exercises/${id}/deactivate`)
      .set("Authorization", "Bearer token")
      .expect(200);
    expect(deactivated.body.message).toBe("Exercise deactivated");
    expect(repository.update).toHaveBeenCalledWith(expect.anything(), id, { status: "inactive" });
  });

  test("review retains validation and conflict checks", async () => {
    login();
    await request(app)
      .patch(`/api/admin/exercises/${id}/review`)
      .set("Authorization", "Bearer token")
      .send({ status: "rejected" })
      .expect(400);
    repository.findById.mockResolvedValue({ id, status: "active" });
    await request(app)
      .patch(`/api/admin/exercises/${id}/review`)
      .set("Authorization", "Bearer token")
      .send({ status: "approved" })
      .expect(409);
    expect(repository.setReviewStatus).not.toHaveBeenCalled();
    login("trainer");
    await request(app).get("/api/admin/exercises").set("Authorization", "Bearer token").expect(403);
  });

  test("list cache retains key, TTL, MISS/HIT and JSON envelope", async () => {
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue("OK") };
    getRedisClient.mockResolvedValue(redis);
    const miss = await request(app).get("/api/exercises").expect(200);
    expect(miss.headers["x-cache"]).toBe("MISS");
    expect(redis.set).toHaveBeenCalledWith("exercises:/api/exercises", JSON.stringify(miss.body), { EX: 300 });
    redis.get.mockResolvedValue(JSON.stringify(miss.body));
    const hit = await request(app).get("/api/exercises").expect(200);
    expect(hit.headers["x-cache"]).toBe("HIT");
    expect(hit.body).toEqual(miss.body);
    expect(repository.list).toHaveBeenCalledTimes(1);
  });

  test("cache outage does not prevent reads; validation failures are not cached", async () => {
    getRedisClient.mockRejectedValueOnce(new Error("offline"));
    await request(app).get("/api/exercises").expect(200);
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    getRedisClient.mockResolvedValue(redis);
    await request(app).get("/api/exercises?limit=0").expect(400);
    expect(redis.set).not.toHaveBeenCalled();
  });
});
