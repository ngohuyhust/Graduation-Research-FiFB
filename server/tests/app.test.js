const request = require("supertest");
const { createApp } = require("../src/app");

describe("app", () => {
  test("GET /api/health returns OK envelope", async () => {
    const response = await request(createApp()).get("/api/health").expect(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: "ok" },
      message: "OK",
    });
  });

  test("unknown route uses standard error envelope", async () => {
    const response = await request(createApp()).get("/api/missing").expect(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
