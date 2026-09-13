jest.mock("../src/redis/client", () => ({ getRedisClient: jest.fn() }));
const { AuthRepository } = require("../src/modules/auth/auth.repository");
const { getRedisClient } = require("../src/redis/client");
const { env } = require("../src/config/env");
describe("Nest auth persistence", () => {
  let repository, db, client, nodeEnv;
  beforeEach(() => {
    nodeEnv = env.nodeEnv;
    db = { query: jest.fn().mockResolvedValue({ rows: [{ id: "user", role: "trainer", status: "active", email_verified_at: "2026-01-01" }] }) };
    client = { query: jest.fn() };
    repository = new AuthRepository(db);
    getRedisClient.mockResolvedValue(null);
  });
  afterEach(() => { env.nodeEnv = nodeEnv; jest.clearAllMocks(); });
  const session = (hash, expiresAt = new Date(Date.now() + 60000)) => ({ userId: "user", refreshTokenHash: hash, expiresAt });
  test("memory sessions resolve current account state and support individual/all revocation", async () => {
    await repository.createSession(client, session("one"));
    await repository.createSession(client, session("two"));
    expect(await repository.findSessionByHash(client, "one")).toMatchObject({ user_id: "user", role: "trainer" });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("deleted_at IS NULL"), ["user"]);
    await repository.revokeSessionByHash(client, "one");
    expect(await repository.findSessionByHash(client, "one")).toBeNull();
    await repository.revokeUserSessions(client, "user");
    expect(await repository.findSessionByHash(client, "two")).toBeNull();
  });
  test("expired sessions and deleted accounts cannot refresh", async () => {
    await repository.createSession(client, session("expired", new Date(0)));
    expect(await repository.findSessionByHash(client, "expired")).toBeNull();
    await repository.createSession(client, session("deleted")); db.query.mockResolvedValue({ rows: [] });
    expect(await repository.findSessionByHash(client, "deleted")).toBeNull();
  });
  test.each([["Verification", "markVerificationUsed"], ["PasswordReset", "markPasswordResetUsed"]])("%s tokens expire and can be consumed once", async (kind, consume) => {
    await repository[`create${kind}Token`](client, { userId: "user", tokenHash: "token", expiresAt: new Date(Date.now() + 60000) });
    expect(await repository[`find${kind}Token`](client, "token")).toMatchObject({ id: "token", user_id: "user" });
    await repository[consume](client, "token");
    expect(await repository[`find${kind}Token`](client, "token")).toBeNull();
    await repository[`create${kind}Token`](client, { userId: "user", tokenHash: "expired", expiresAt: new Date(0) });
    await repository.cleanupExpiredTokens();
    expect(await repository[`find${kind}Token`](client, "expired")).toBeNull();
  });
  test("production requires Redis before creating credentials", async () => {
    env.nodeEnv = "production";
    await expect(repository.createSession(client, session("hash"))).rejects.toThrow("Persistent Redis auth store is required in production");
    await expect(repository.createVerificationToken(client, { userId: "user", tokenHash: "hash", expiresAt: new Date() })).rejects.toThrow("Persistent Redis");
  });
  test("Redis storage keeps TTL and user session index", async () => {
    const redis = { set: jest.fn(), get: jest.fn(), del: jest.fn(), sAdd: jest.fn(), sMembers: jest.fn().mockResolvedValue(["hash"]) };
    getRedisClient.mockResolvedValue(redis);
    await repository.createSession(client, session("hash"));
    expect(redis.set).toHaveBeenCalledWith("session:hash", expect.any(String), { EX: expect.any(Number) });
    expect(redis.sAdd).toHaveBeenCalledWith("user_sessions:user", "hash");
    redis.get.mockResolvedValue(redis.set.mock.calls[0][1]);
    expect(await repository.findSessionByHash(client, "hash")).toMatchObject({ user_id: "user" });
    await repository.revokeSessionByHash(client, "hash");
    expect(redis.del).toHaveBeenCalledWith("session:hash");
    await repository.revokeUserSessions(client, "user");
    expect(redis.del).toHaveBeenCalledWith(["session:hash"]);
    expect(redis.del).toHaveBeenCalledWith("user_sessions:user");
  });
});
