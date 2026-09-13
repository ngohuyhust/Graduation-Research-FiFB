const request = require("supertest");
const { createApp } = require("../src/app");
const { UsersRepository } = require("../src/modules/users/users.repository");
const { DatabaseService } = require("../src/db/database.service");
const { NotificationsRepository } = require("../src/modules/notifications/notifications.repository");
const { signAccessToken } = new (require("../src/modules/auth/jwt.service").JwtService)();
const userId = "d44b9038-7685-40c5-bb65-c075584c83ac";
const id = "b18cfd54-c056-4c53-b5c0-4e7890f7521d";
describe("Nest notifications", () => {
  let app, actor, query;
  beforeAll(async () => { app = await createApp(); });
  afterAll(async () => { await app.locals.nest.close(); });
  beforeEach(() => {
    actor = { id: userId, role: "user", status: "active", email_verified_at: "2026-01-01" };
    jest.spyOn(app.locals.nest.get(UsersRepository), "findById").mockImplementation(async () => actor);
    query = jest.spyOn(app.locals.nest.get(DatabaseService), "query").mockImplementation(async (sql) => ({ rows: sql.includes("count(*)") ? [{ total: 1 }] : [{ id, recipient_id: userId }] }));
  });
  afterEach(() => jest.restoreAllMocks());
  const auth = (actor) => `Bearer ${signAccessToken(actor)}`;
  test("list is recipient-scoped and preserves pagination", async () => {
    const result = await request(app).get("/api/notifications?page=2&limit=5").set("Authorization", auth(actor)).expect(200);
    expect(result.body.data).toEqual({ items: [{ id, recipient_id: userId }], page: 2, limit: 5, total: 1, totalPages: 1 });
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("recipient_id = $1"), [userId, 5, 5]);
  });
  test("mark read and read-all preserve SQL ownership and statuses", async () => {
    const read = await request(app).patch(`/api/notifications/${id}/read`).set("Authorization", auth(actor)).expect(200);
    expect(read.body.message).toBe("Notification marked read");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1 AND recipient_id = $2"), [id, userId]);
    const all = await request(app).patch("/api/notifications/read-all").set("Authorization", auth(actor)).expect(204);
    expect(all.text).toBe("");
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("recipient_id = $1 AND read_at IS NULL"), [userId]);
  });
  test("missing or unowned notification retains null success result", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const result = await request(app).patch(`/api/notifications/${id}/read`).set("Authorization", auth(actor)).expect(200);
    expect(result.body.data).toEqual({ notification: null });
  });
  test("shared creation uses caller's transaction executor", async () => {
    const client = { query: jest.fn().mockResolvedValueOnce({ rows: [{ id }] }).mockResolvedValueOnce({ rows: [{ total: 1 }] }) };
    await app.locals.nest.get(NotificationsRepository).createNotification(client, { recipientId: userId, type: "test", title: "Test" });
    expect(client.query).toHaveBeenCalledTimes(2); expect(query).not.toHaveBeenCalled();
    expect(client.query.mock.calls[0][1]).toEqual([userId, null, "test", "Test", null, null, false, {}]);
  });
  test("account guards, query and UUID validation; admins can read own notifications", async () => {
    await request(app).get("/api/notifications").expect(401);
    actor.status = "locked";
    await request(app).get("/api/notifications").set("Authorization", auth(actor)).expect(403);
    actor.status = "active"; actor.email_verified_at = null;
    await request(app).patch("/api/notifications/read-all").set("Authorization", auth(actor)).expect(403);
    actor.email_verified_at = "2026-01-01"; actor.role = "admin";
    await request(app).get("/api/notifications?limit=101").set("Authorization", auth(actor)).expect(400);
    await request(app).patch("/api/notifications/bad/read").set("Authorization", auth(actor)).expect(400);
    expect(query).not.toHaveBeenCalled();
    await request(app).get("/api/notifications").set("Authorization", auth(actor)).expect(200);
  });
});
