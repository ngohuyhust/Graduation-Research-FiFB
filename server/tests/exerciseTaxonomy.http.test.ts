const request = require("supertest");

jest.mock("../src/modules/exerciseTaxonomy/exerciseTaxonomy.repository", () => {
  const actual = jest.requireActual("../src/modules/exerciseTaxonomy/exerciseTaxonomy.repository");
  const list = jest.fn(),
    create = jest.fn();
  class ExerciseTaxonomyRepository extends actual.ExerciseTaxonomyRepository {
    list(...args) {
      return list(...args);
    }
    create(...args) {
      return create(...args);
    }
  }
  return { ...actual, ExerciseTaxonomyRepository, list, create };
});
jest.mock("../src/modules/auth/jwt.service", () => {
  const actual = jest.requireActual("../src/modules/auth/jwt.service");
  const verifyAccessToken = jest.fn();
  class JwtService extends actual.JwtService {
    verifyAccessToken(...args) {
      return verifyAccessToken(...args);
    }
  }
  return { ...actual, JwtService, verifyAccessToken };
});
jest.mock("../src/redis/client", () => ({ getRedisClient: jest.fn() }));
jest.mock("../src/utils/cache", () => ({ invalidateByPrefix: jest.fn() }));

const { createApp } = require("../src/app");
const { ExerciseTaxonomyService } = require("../src/modules/exerciseTaxonomy/exerciseTaxonomy.service");
const repository = require("../src/modules/exerciseTaxonomy/exerciseTaxonomy.repository");
const { UsersRepository } = require("../src/modules/users/users.repository");
const users = UsersRepository.prototype;
const jwt = require("../src/modules/auth/jwt.service");
const { getRedisClient } = require("../src/redis/client");
const { invalidateByPrefix } = require("../src/utils/cache");
const { AppError } = require("../src/utils/errors/AppError");
const kinds = ["bodyParts", "equipments", "muscles"];

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

describe("Nest exercise taxonomy HTTP contract", () => {
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
    repository.list.mockResolvedValue([{ id: "item-id", name: "Chest" }]);
    repository.create.mockResolvedValue({ id: "item-id", name: "Chest" });
  });

  test.each(kinds)("public %s list uses Nest service and preserves response", async (kind) => {
    expect(app.locals.nest.get(ExerciseTaxonomyService)).toBeInstanceOf(ExerciseTaxonomyService);
    const response = await request(app).get(`/api/exercise-taxonomy/${kind}`).expect(200);
    expect(repository.list).toHaveBeenCalledWith(kind);
    expect(response.body).toEqual({
      success: true,
      data: { items: [{ id: "item-id", name: "Chest" }] },
      message: "OK",
    });
  });

  test.each(kinds)("admin can create %s with trimmed name and cache invalidation", async (kind) => {
    login();
    const response = await request(app)
      .post(`/api/exercise-taxonomy/${kind}`)
      .set("Authorization", "Bearer token")
      .send({ name: " Chest ", extra: true })
      .expect(201);
    expect(repository.create).toHaveBeenCalledWith(kind, "Chest");
    expect(invalidateByPrefix).toHaveBeenCalledWith("taxonomy:");
    expect(response.body).toEqual({
      success: true,
      data: { item: { id: "item-id", name: "Chest" } },
      message: "Taxonomy item saved",
    });
  });

  test.each(kinds)("%s writes enforce authentication and authorization", async (kind) => {
    const path = `/api/exercise-taxonomy/${kind}`;
    await request(app).post(path).send({ name: "Chest" }).expect(401);
    for (const [role, overrides] of [
      ["user", {}],
      ["trainer", {}],
      ["admin", { status: "locked" }],
      ["admin", { email_verified_at: null }],
    ]) {
      login(role as string, overrides);
      await request(app).post(path).set("Authorization", "Bearer token").send({ name: "Chest" }).expect(403);
    }
    expect(repository.create).not.toHaveBeenCalled();
    expect(invalidateByPrefix).not.toHaveBeenCalled();
  });

  test.each([{}, { name: " " }, { name: "x".repeat(121) }, { name: 42 }])(
    "invalid payload %j preserves validation error",
    async (body) => {
      login();
      const response = await request(app)
        .post("/api/exercise-taxonomy/bodyParts")
        .set("Authorization", "Bearer token")
        .set("X-Request-Id", "taxonomy-input")
        .send(body)
        .expect(400);
      expect(response.body).toMatchObject({
        success: false,
        requestId: "taxonomy-input",
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: { fieldErrors: { name: expect.any(Array) } },
        },
      });
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  test.each(kinds)("%s cache retains per-route key, 900-second TTL and HIT/MISS", async (kind) => {
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue("OK") };
    getRedisClient.mockResolvedValue(redis);
    const path = `/api/exercise-taxonomy/${kind}`;
    const miss = await request(app).get(path).expect(200);
    expect(miss.headers["x-cache"]).toBe("MISS");
    expect(redis.set).toHaveBeenCalledWith(`taxonomy:${path}`, JSON.stringify(miss.body), { EX: 900 });
    // Upstash can return parsed JSON while Redis TCP returns a string.
    redis.get.mockResolvedValue(miss.body);
    const hit = await request(app).get(path).expect(200);
    expect(hit.body).toEqual(miss.body);
    expect(hit.headers["x-cache"]).toBe("HIT");
    expect(repository.list).toHaveBeenCalledTimes(1);
  });

  test("unknown taxonomy paths remain 404 for both GET and POST", async () => {
    for (const path of [
      "/api/exercise-taxonomy",
      "/api/exercise-taxonomy/unknown",
      "/api/exercise-taxonomy/bodyParts/extra",
    ]) {
      for (const method of ["get", "post"]) {
        const response = await request(app)[method](path).expect(404);
        expect(response.body.error.code).toBe("NOT_FOUND");
      }
    }
    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  test("failed write preserves error and does not invalidate cache", async () => {
    login();
    repository.create.mockRejectedValue(new AppError("CONFLICT", "Taxonomy conflict", 409));
    const response = await request(app)
      .post("/api/exercise-taxonomy/muscles")
      .set("Authorization", "Bearer token")
      .send({ name: "Chest" })
      .expect(409);
    expect(response.body.error.message).toBe("Taxonomy conflict");
    expect(invalidateByPrefix).not.toHaveBeenCalled();
  });
});

export {};
