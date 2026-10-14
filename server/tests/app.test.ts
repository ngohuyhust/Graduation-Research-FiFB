// Kiem thu tu dong cho app.
const request = require("supertest");
const { createApp } = require("../src/app");

describe("app", () => {
  let app;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.locals.nest.close();
  });
  test.each(["/api", "/api/v1"])("GET %s/health returns OK envelope", async (prefix) => {
    const response = await request(app).get(`${prefix}/health`).expect(200);
    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.body).toEqual({
      success: true,
      data: { status: "ok" },
      message: "OK",
    });
  });

  test("preserves a caller-provided request ID", async () => {
    const response = await request(app).get("/api/health").set("X-Request-Id", "trace-123").expect(200);
    expect(response.headers["x-request-id"]).toBe("trace-123");
  });

  test("unknown route uses standard error envelope", async () => {
    const response = await request(app).get("/api/missing").expect(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  test.each(["/api", "/api/v1", "/api/v2"])("unknown %s route uses the error envelope", async (prefix) => {
    const response = await request(app).get(`${prefix}/missing`).expect(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  test("unsupported API versions do not fall through to legacy routes", async () => {
    await request(app).get("/api/v2/health").expect(404);
  });

  test.each(["/api", "/api/v1"])("%s retains authentication and request validation", async (prefix) => {
    await request(app).get(`${prefix}/workout-sessions`).expect(401);
    const response = await request(app).post(`${prefix}/auth/login`).send({ email: "invalid" }).expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("OpenAPI documents versioned routes, Zod inputs, pagination, and security", async () => {
    const { body } = await request(app).get("/api/openapi.json").expect(200);
    expect(body.openapi).toMatch(/^3\./);
    expect(Object.keys(body.paths).length).toBeGreaterThan(40);
    expect(Object.keys(body.paths).every((path) => path.startsWith("/api/v1/"))).toBe(true);
    const login = body.paths["/api/v1/auth/login"].post;
    expect(login.requestBody.content["application/json"].schema).toMatchObject({
      required: ["email", "password"],
      properties: { email: { type: "string", format: "email" } },
    });
    expect(login.security || []).toEqual([]);
    const sessions = body.paths["/api/v1/workout-sessions"].get;
    expect(sessions.security).toEqual([{ bearer: [] }]);
    expect(sessions.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "page", in: "query", schema: expect.objectContaining({ default: 1 }) }),
        expect.objectContaining({ name: "limit", in: "query" }),
      ]),
    );
    expect(body.paths["/api/v1/auth/logout"].post.responses["204"].content).toBeUndefined();
    expect(body.paths["/api/v1/auth/refresh"].post.security).toEqual([{ refreshCookie: [] }]);
    expect(body.paths["/api/v1/exercises/{id}"].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "id",
          in: "path",
          required: true,
          schema: expect.objectContaining({ format: "uuid" }),
        }),
      ]),
    );
    await request(app).get("/api/docs/").expect(200);
  });
});

export {};
