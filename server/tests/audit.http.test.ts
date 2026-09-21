const request = require("supertest");
const { createApp } = require("../src/app");
const { UsersRepository } = require("../src/modules/users/users.repository");
const { DatabaseService } = require("../src/db/database.service");
const { AuditRepository } = require("../src/modules/audit/audit.repository");
const { signAccessToken } = new (require("../src/modules/auth/jwt.service").JwtService)();
const id = "d44b9038-7685-40c5-bb65-c075584c83ac";
describe("Nest audit module behind admin endpoints", () => {
  let app, actor, query;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.locals.nest.close();
  });
  beforeEach(() => {
    actor = { id, role: "admin", status: "active", email_verified_at: "2026-01-01" };
    jest.spyOn(app.locals.nest.get(UsersRepository), "findById").mockImplementation(async () => actor);
    query = jest.spyOn(app.locals.nest.get(DatabaseService), "query").mockImplementation(async (sql) => ({
      rows: String(sql).includes("count(*)") ? [{ total: 1 }] : [{ id, action: "trainer.verify" }],
    }));
  });
  afterEach(() => jest.restoreAllMocks());
  const auth = (actor) => `Bearer ${signAccessToken(actor)}`;
  test("filters and pagination use bound SQL parameters", async () => {
    const result = await request(app)
      .get(`/api/admin/audit-logs?action=trainer.verify&entityType=trainer&actorId=${id}&page=2&limit=5`)
      .set("Authorization", auth(actor))
      .expect(200);
    expect(result.body.data).toEqual({
      items: [{ id, action: "trainer.verify" }],
      page: 2,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("actor_id = $3"), [
      "trainer.verify",
      "trainer",
      id,
      5,
      5,
    ]);
  });
  test("audit insertion preserves caller transaction and metadata", async () => {
    const client = { query: jest.fn() };
    await app.locals.nest.get(AuditRepository).createAudit(client, {
      actorId: id,
      action: "user.locked",
      entityType: "user",
      entityId: id,
      oldValues: { status: "active" },
      newValues: { status: "locked" },
      ipAddress: "127.0.0.1",
      userAgent: "test",
    });
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO audit_logs"), [
      id,
      "user.locked",
      "user",
      id,
      { status: "active" },
      { status: "locked" },
      "127.0.0.1",
      "test",
    ]);
    expect(query).not.toHaveBeenCalled();
  });
  test("admin-only access and validation remain enforced", async () => {
    await request(app).get("/api/admin/audit-logs").expect(401);
    for (const role of ["user", "trainer"]) {
      actor.role = role;
      await request(app).get("/api/admin/audit-logs").set("Authorization", auth(actor)).expect(403);
    }
    actor.role = "admin";
    await request(app).get("/api/admin/audit-logs?actorId=bad").set("Authorization", auth(actor)).expect(400);
    await request(app).get("/api/admin/audit-logs?limit=101").set("Authorization", auth(actor)).expect(400);
    expect(query).not.toHaveBeenCalled();
  });
});

export {};
