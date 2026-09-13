jest.mock("../src/redis/client", () => ({ getRedisClient: jest.fn() }));
const request = require("supertest");
const { createApp } = require("../src/app");
const { UsersRepository } = require("../src/modules/users/users.repository");
const { WorkoutSessionsRepository } = require("../src/modules/workoutSessions/workoutSessions.repository");
const { signAccessToken } = require("../src/modules/auth/jwt.service");
const { getRedisClient } = require("../src/redis/client");
const userId = "d44b9038-7685-40c5-bb65-c075584c83ac";
const id = "b18cfd54-c056-4c53-b5c0-4e7890f7521d";
describe("Nest workout sessions", () => {
  let app, repo, actor, redis;
  beforeAll(async () => { app = await createApp(); repo = app.locals.nest.get(WorkoutSessionsRepository); });
  afterAll(async () => { await app.locals.nest.close(); });
  beforeEach(() => {
    actor = { id: userId, role: "user", status: "active", email_verified_at: "2026-01-01" };
    jest.spyOn(app.locals.nest.get(UsersRepository), "findById").mockImplementation(async () => actor);
    redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
    getRedisClient.mockResolvedValue(redis);
    for (const [name, result] of Object.entries({ findOwnedPlan: { id }, create: { id }, detail: { id }, update: { id }, addLog: { id }, ensureActiveExercise: true, list: { rows: [{ id }], total: 1 }, progression: { exercise: { id, name: "Squat" }, progression: [], personalRecord: null }, stats: { summary: { total_sessions: 1, this_week_sessions: 1, total_volume_kg: 100 }, dates: [], weekly: [], topExercises: [] } })) jest.spyOn(repo, name).mockResolvedValue(result);
  });
  afterEach(() => jest.restoreAllMocks());
  const auth = (actor) => `Bearer ${signAccessToken(actor)}`;
  test("create and update use actor identity and invalidate statistics", async () => {
    const created = await request(app).post("/api/workout-sessions").set("Authorization", auth(actor)).send({ title: " Push ", workoutPlanId: id, userId: id }).expect(201);
    expect(created.body.message).toBe("Workout session started");
    expect(repo.findOwnedPlan).toHaveBeenCalledWith(userId, id);
    expect(repo.create).toHaveBeenCalledWith(userId, { title: "Push", workoutPlanId: id });
    await request(app).patch(`/api/workout-sessions/${id}`).set("Authorization", auth(actor)).send({ notes: null, completed: true }).expect(200);
    expect(repo.update).toHaveBeenCalledWith(userId, id, { notes: null, completed: true });
    expect(redis.del).toHaveBeenCalledTimes(2); expect(redis.del).toHaveBeenCalledWith(`stats:${userId}`);
  });
  test("logging preserves zero weight and defaults set number", async () => {
    const res = await request(app).post(`/api/workout-sessions/${id}/logs`).set("Authorization", auth(actor)).send({ exerciseId: id, actualWeightKg: 0 }).expect(201);
    expect(res.body.message).toBe("Exercise log added");
    expect(repo.addLog).toHaveBeenCalledWith(userId, id, { exerciseId: id, actualWeightKg: 0, setNumber: 1 });
    expect(redis.del).toHaveBeenCalledWith(`stats:${userId}`);
  });
  test("missing owned plan/session and inactive exercise prevent writes", async () => {
    repo.findOwnedPlan.mockResolvedValue(null);
    await request(app).post("/api/workout-sessions").set("Authorization", auth(actor)).send({ title: "Push", workoutPlanId: id }).expect(404);
    expect(repo.create).not.toHaveBeenCalled();
    repo.ensureActiveExercise.mockResolvedValue(false);
    await request(app).post(`/api/workout-sessions/${id}/logs`).set("Authorization", auth(actor)).send({ exerciseId: id, actualReps: 5 }).expect(400);
    expect(repo.addLog).not.toHaveBeenCalled();
    repo.ensureActiveExercise.mockResolvedValue(true); repo.addLog.mockResolvedValue(null);
    await request(app).post(`/api/workout-sessions/${id}/logs`).set("Authorization", auth(actor)).send({ exerciseId: id, actualReps: 5 }).expect(404);
    repo.detail.mockResolvedValue(null); repo.update.mockResolvedValue(null);
    await request(app).get(`/api/workout-sessions/${id}`).set("Authorization", auth(actor)).expect(404);
    await request(app).patch(`/api/workout-sessions/${id}`).set("Authorization", auth(actor)).send({ title: "Changed" }).expect(404);
    expect(redis.del).not.toHaveBeenCalled();
  });
  test("static stats route, cache TTL/hit and progression response remain intact", async () => {
    const stats = await request(app).get("/api/workout-sessions/stats").set("Authorization", auth(actor)).expect(200);
    expect(stats.body.data).toMatchObject({ totalSessions: 1, totalVolumeKg: 100, currentStreak: 0 });
    expect(redis.set).toHaveBeenCalledWith(`stats:${userId}`, JSON.stringify(stats.body.data), { EX: 1800 });
    redis.get.mockResolvedValue(JSON.stringify(stats.body.data));
    await request(app).get("/api/workout-sessions/stats").set("Authorization", auth(actor)).expect(200);
    expect(repo.stats).toHaveBeenCalledTimes(1);
    const progression = await request(app).get(`/api/workout-sessions/progression/${id}`).set("Authorization", auth(actor)).expect(200);
    expect(progression.body.data).toEqual({ exerciseId: id, exerciseName: "Squat", progression: [], personalRecord: null });
    repo.progression.mockResolvedValue(null);
    await request(app).get(`/api/workout-sessions/progression/${id}`).set("Authorization", auth(actor)).expect(404);
  });
  test("list pagination, validation and role/account guards", async () => {
    await request(app).get("/api/workout-sessions").expect(401);
    actor.role = "admin";
    await request(app).get("/api/workout-sessions").set("Authorization", auth(actor)).expect(403);
    actor.role = "trainer";
    await request(app).get("/api/workout-sessions?page=2&limit=10").set("Authorization", auth(actor)).expect(200);
    expect(repo.list).toHaveBeenCalledWith(userId, { page: 2, limit: 10 });
    await request(app).patch(`/api/workout-sessions/${id}`).set("Authorization", auth(actor)).send({}).expect(400);
    await request(app).post(`/api/workout-sessions/${id}/logs`).set("Authorization", auth(actor)).send({ exerciseId: id }).expect(400);
    await request(app).get("/api/workout-sessions/progression/bad").set("Authorization", auth(actor)).expect(400);
    actor.status = "locked";
    await request(app).get("/api/workout-sessions/stats").set("Authorization", auth(actor)).expect(403);
    actor.status = "active"; actor.email_verified_at = null;
    await request(app).get("/api/workout-sessions/stats").set("Authorization", auth(actor)).expect(403);
  });
});
