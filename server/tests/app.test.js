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
  test("GET /api/health returns OK envelope", async () => {
    const response = await request(app).get("/api/health").expect(200);
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
});
