import { randomUUID } from "crypto";
import request from "supertest";
import type { Express } from "express";
import type { INestApplication } from "@nestjs/common";
import { createApp } from "../../src/app";
import { pool, closePool, withTransaction } from "../../src/db/pool";
import { closeRedis, getRedisClient } from "../../src/redis/client";
import { AuthRepository } from "../../src/modules/auth/auth.repository";
import { DatabaseService } from "../../src/db/database.service";
import { JwtService } from "../../src/modules/auth/jwt.service";
import { hash as hashPassword } from "bcryptjs";

describe("migrated PostgreSQL and Redis backend", () => {
  const userId = randomUUID();
  const otherId = randomUUID();
  const exerciseId = randomUUID();
  const hash = randomUUID();
  let app: Express;
  let nest: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    const migrations = await pool.query(
      "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank",
    );
    expect(migrations.rows.map((row) => row.version)).toEqual(["1", "2", "3", "4", "5"]);
    await pool.query(
      "INSERT INTO app_users (id, email, password_hash, email_verified_at) VALUES ($1, $2, $5, now()), ($3, $4, $5, now())",
      [
        userId,
        `${userId}@example.com`,
        otherId,
        `${otherId}@example.com`,
        await hashPassword("integration-password", 8),
      ],
    );
    await pool.query("INSERT INTO exercises (id, name) VALUES ($1, 'Integration exercise')", [exerciseId]);
    app = await createApp();
    nest = app.locals.nest;
    const jwt = nest.get(JwtService);
    token = jwt.signAccessToken({ id: userId, role: "user", status: "active" });
    otherToken = jwt.signAccessToken({ id: otherId, role: "user", status: "active" });
  });

  afterAll(async () => {
    try {
      if (nest) {
        await nest.get(AuthRepository).revokeUserSessions(nest.get(DatabaseService), userId);
        await (await getRedisClient())!.del(`stats:${userId}`);
        await nest.close();
      }
      await pool.query("DELETE FROM workout_sessions WHERE user_id IN ($1, $2)", [userId, otherId]);
      await pool.query("DELETE FROM exercises WHERE id = $1", [exerciseId]);
      await pool.query("DELETE FROM app_users WHERE id IN ($1, $2)", [userId, otherId]);
    } finally {
      await closeRedis();
      await closePool();
    }
  });

  test("V2 leaves missing measurements null and retains database constraints", async () => {
    const { rows } = await pool.query("SELECT gender, height, weight FROM app_users WHERE id = $1", [userId]);
    expect(rows[0]).toEqual({ gender: null, height: null, weight: null });
    await expect(pool.query("UPDATE app_users SET weight = -1 WHERE id = $1", [userId])).rejects.toMatchObject({
      code: "23514",
    });
  });

  test("training profiles persist, replace selections, and isolate owners", async () => {
    const path = "/api/v1/users/me/training-profile";
    const profile = {
      goal: "strength",
      experienceLevel: "beginner",
      daysPerWeek: 3,
      sessionMinutes: 45,
      location: "home",
      equipmentIds: [],
      priorityMuscleIds: [],
      dislikedExerciseIds: [exerciseId],
      limitations: "No jumping",
    };
    await request(app).put(path).auth(token, { type: "bearer" }).send(profile).expect(200);
    const saved = await request(app).get(path).auth(token, { type: "bearer" }).expect(200);
    expect(saved.body.data.profile).toMatchObject(profile);
    const other = await request(app).get(path).auth(otherToken, { type: "bearer" }).expect(200);
    expect(other.body.data.profile).toBeNull();
    await request(app)
      .put(path)
      .auth(token, { type: "bearer" })
      .send({ ...profile, equipmentIds: [randomUUID()] })
      .expect(400);
    const unchanged = await request(app).get(path).auth(token, { type: "bearer" }).expect(200);
    expect(unchanged.body.data.profile).toEqual(saved.body.data.profile);
    // Retiring an already excluded exercise must not prevent unrelated profile edits.
    await pool.query("UPDATE exercises SET status = 'inactive' WHERE id = $1", [exerciseId]);
    await request(app).put(path).auth(token, { type: "bearer" }).send(profile).expect(200);
    await request(app).put(path).auth(otherToken, { type: "bearer" }).send(profile).expect(400);
    await pool.query("UPDATE exercises SET status = 'active' WHERE id = $1", [exerciseId]);
    await request(app)
      .put(path)
      .auth(token, { type: "bearer" })
      .send({ ...profile, dislikedExerciseIds: [] })
      .expect(200);
    const updated = await request(app).get(path).auth(token, { type: "bearer" }).expect(200);
    expect(updated.body.data.profile.dislikedExerciseIds).toEqual([]);
    expect(updated.body.data.profile.completedAt).toBe(saved.body.data.profile.completedAt);
  });

  test("native login rotates and revokes real Redis sessions", async () => {
    const login = await request(app)
      .post("/api/v1/auth/mobile/login")
      .send({ email: `${userId}@example.com`, password: "integration-password" })
      .expect(200);
    const original = login.body.data.refreshToken;
    const refresh = await request(app).post("/api/v1/auth/mobile/refresh").send({ refreshToken: original }).expect(200);
    expect(refresh.body.data.refreshToken).not.toBe(original);
    await request(app).post("/api/v1/auth/mobile/refresh").send({ refreshToken: original }).expect(401);
    const me = await request(app)
      .get("/api/v1/auth/me")
      .auth(refresh.body.data.accessToken, { type: "bearer" })
      .expect(200);
    expect(me.body.data.user.id).toBe(userId);
    await request(app)
      .post("/api/v1/auth/mobile/logout")
      .send({ refreshToken: refresh.body.data.refreshToken })
      .expect(204);
    await request(app)
      .post("/api/v1/auth/mobile/refresh")
      .send({ refreshToken: refresh.body.data.refreshToken })
      .expect(401);
  });

  test("transactions roll back real writes", async () => {
    await expect(
      withTransaction(async (client) => {
        await client.query("UPDATE app_users SET full_name = 'rolled back' WHERE id = $1", [userId]);
        throw new Error("rollback probe");
      }),
    ).rejects.toThrow("rollback probe");
    const { rows } = await pool.query("SELECT full_name FROM app_users WHERE id = $1", [userId]);
    expect(rows[0].full_name).toBeNull();
  });

  test("scheduled plans persist, isolate owners, and validate edits atomically", async () => {
    let planId: string | undefined;
    try {
      const created = await request(app)
        .post("/api/v1/workout-plans")
        .auth(token, { type: "bearer" })
        .send({
          title: "Scheduled",
          items: [{ exerciseId, dayNumber: 2, sortOrder: 1, restSeconds: 0 }],
          schedule: [{ weekday: 1, dayNumber: 2 }],
        })
        .expect(201);
      planId = created.body.data.plan.id;
      expect(created.body.data.plan.items[0].exercise_name).toBe("Integration exercise");
      const today = () => request(app).get("/api/v1/workout-plans/today?weekday=1").auth(token, { type: "bearer" });
      expect((await today().expect(200)).body.data.items).toHaveLength(1);
      const other = await request(app)
        .get("/api/v1/workout-plans/today?weekday=1")
        .auth(otherToken, { type: "bearer" })
        .expect(200);
      expect(other.body.data.items).toEqual([]);
      await request(app)
        .patch(`/api/v1/workout-plans/${planId}`)
        .auth(token, { type: "bearer" })
        .send({ items: [] })
        .expect(400);
      expect((await today().expect(200)).body.data.items[0].items).toHaveLength(1);
      await request(app)
        .patch(`/api/v1/workout-plans/${planId}`)
        .auth(token, { type: "bearer" })
        .send({ title: "Renamed", description: "" })
        .expect(200);
      expect((await today().expect(200)).body.data.items[0].title).toBe("Renamed");
      await request(app).delete(`/api/v1/workout-plans/${planId}`).auth(token, { type: "bearer" }).expect(200);
      expect((await today().expect(200)).body.data.items).toEqual([]);
      await request(app)
        .patch(`/api/v1/workout-plans/${planId}`)
        .auth(token, { type: "bearer" })
        .send({ status: "active" })
        .expect(200);
      expect((await today().expect(200)).body.data.items).toHaveLength(1);
      await request(app)
        .patch(`/api/v1/workout-plans/${planId}`)
        .auth(token, { type: "bearer" })
        .send({ items: [], schedule: [] })
        .expect(200);
      expect((await today().expect(200)).body.data.items).toEqual([]);
    } finally {
      if (planId) {
        await pool.query("DELETE FROM workout_plan_items WHERE workout_plan_id = $1", [planId]);
        await pool.query("DELETE FROM workout_plans WHERE id = $1", [planId]);
      }
    }
  });

  test("muscle filters execute with role isolation and favorites remain private", async () => {
    const muscleId = randomUUID();
    const name = `integration-${muscleId}`;
    try {
      await pool.query("INSERT INTO muscles (id, name) VALUES ($1, $2)", [muscleId, name]);
      await pool.query("INSERT INTO exercise_muscles VALUES ($1, $2, 'target')", [exerciseId, muscleId]);
      const target = await request(app).get("/api/v1/exercises").query({ targetMuscle: name }).expect(200);
      expect(target.body.data.items.map((item) => item.id)).toEqual([exerciseId]);
      const secondary = await request(app).get("/api/v1/exercises").query({ secondaryMuscle: name }).expect(200);
      expect(secondary.body.data.items).toEqual([]);
      await request(app).post("/api/v1/favorites").auth(token, { type: "bearer" }).send({ exerciseId }).expect(201);
      const saved = await request(app)
        .get(`/api/v1/favorites/${exerciseId}`)
        .auth(token, { type: "bearer" })
        .expect(200);
      expect(saved.body.data.isFavorite).toBe(true);
      const other = await request(app)
        .get(`/api/v1/favorites/${exerciseId}`)
        .auth(otherToken, { type: "bearer" })
        .expect(200);
      expect(other.body.data.isFavorite).toBe(false);
    } finally {
      await pool.query("DELETE FROM favorite_exercises WHERE user_id = $1 AND exercise_id = $2", [userId, exerciseId]);
      await pool.query("DELETE FROM exercise_muscles WHERE muscle_id = $1", [muscleId]);
      await pool.query("DELETE FROM muscles WHERE id = $1", [muscleId]);
    }
  });

  test("Redis auth sessions have a TTL, join real users, and can be revoked", async () => {
    const repository = nest.get(AuthRepository);
    const db = nest.get(DatabaseService);
    await repository.createSession(db, { userId, refreshTokenHash: hash, expiresAt: new Date(Date.now() + 60000) });
    const redis = (await getRedisClient())!;
    expect(Number(await redis.sendCommand(["TTL", `session:${hash}`]))).toBeGreaterThan(0);
    expect(await repository.findSessionByHash(db, hash)).toMatchObject({ user_id: userId, role: "user" });
    await repository.revokeSessionByHash(db, hash);
    expect(await repository.findSessionByHash(db, hash)).toBeNull();
  });

  test("session snapshots and retry keys survive edits, deletion and completion", async () => {
    let planId: string | undefined, sessionId: string | undefined;
    try {
      const plan = await request(app)
        .post("/api/v1/workout-plans")
        .auth(token, { type: "bearer" })
        .send({ title: "Snapshot plan", items: [{ exerciseId, dayNumber: 2, sortOrder: 1, reps: 8 }] })
        .expect(201);
      planId = plan.body.data.plan.id;
      const body = { title: "Snapshot session", workoutPlanId: planId, dayNumber: 2, clientOperationId: randomUUID() };
      const starts = await Promise.all(
        [1, 2].map(() =>
          request(app).post("/api/v1/workout-sessions").auth(token, { type: "bearer" }).send(body).expect(201),
        ),
      );
      sessionId = starts[0].body.data.session.id;
      expect(starts[1].body.data.session.id).toBe(sessionId);
      await request(app)
        .patch(`/api/v1/workout-plans/${planId}`)
        .auth(token, { type: "bearer" })
        .send({ items: [] })
        .expect(200);
      const get = () =>
        request(app).get(`/api/v1/workout-sessions/${sessionId}`).auth(token, { type: "bearer" }).expect(200);
      expect((await get()).body.data.session.planned_exercises[0]).toMatchObject({
        exercise_id: exerciseId,
        day_number: 2,
        reps: 8,
      });
      const log = {
        exerciseId,
        actualReps: 8,
        actualWeightKg: 0,
        clientOperationId: randomUUID(),
        restEndsAt: new Date(Date.now() + 60000).toISOString(),
      };
      const add = () =>
        request(app)
          .post(`/api/v1/workout-sessions/${sessionId}/logs`)
          .auth(token, { type: "bearer" })
          .send(log)
          .expect(201);
      const logs = await Promise.all([add(), add()]);
      const logId = logs[0].body.data.log.id;
      expect(logs[1].body.data.log.id).toBe(logId);
      expect((await get()).body.data.session.logs).toHaveLength(1);
      await request(app)
        .post(`/api/v1/workout-sessions/${sessionId}/logs`)
        .auth(token, { type: "bearer" })
        .send({ ...log, actualReps: 9 })
        .expect(409);
      await request(app)
        .put(`/api/v1/workout-sessions/${sessionId}/logs/${logId}`)
        .auth(otherToken, { type: "bearer" })
        .send({ exerciseId, actualReps: 12 })
        .expect(404);
      await request(app)
        .put(`/api/v1/workout-sessions/${sessionId}/logs/${logId}`)
        .auth(token, { type: "bearer" })
        .send({ exerciseId, actualReps: 12 })
        .expect(200);
      expect((await get()).body.data.session.logs[0].actual_reps).toBe(12);
      await request(app)
        .delete(`/api/v1/workout-sessions/${sessionId}/logs/${logId}`)
        .auth(token, { type: "bearer" })
        .expect(200);
      await add();
      expect((await get()).body.data.session.logs).toEqual([]);
      await request(app)
        .patch(`/api/v1/workout-sessions/${sessionId}`)
        .auth(token, { type: "bearer" })
        .send({ paused: true, restEndsAt: null })
        .expect(200);
      expect((await get()).body.data.session.paused).toBe(true);
      await request(app)
        .patch(`/api/v1/workout-sessions/${sessionId}`)
        .auth(token, { type: "bearer" })
        .send({ completed: true })
        .expect(200);
      await add();
      await request(app)
        .post(`/api/v1/workout-sessions/${sessionId}/logs`)
        .auth(token, { type: "bearer" })
        .send({ exerciseId, actualReps: 5, clientOperationId: randomUUID() })
        .expect(404);
      await request(app)
        .delete(`/api/v1/workout-sessions/${sessionId}/logs/${logId}`)
        .auth(token, { type: "bearer" })
        .expect(404);
    } finally {
      if (sessionId) await pool.query("DELETE FROM workout_sessions WHERE id = $1", [sessionId]);
      if (planId) {
        await pool.query("DELETE FROM workout_plan_items WHERE workout_plan_id = $1", [planId]);
        await pool.query("DELETE FROM workout_plans WHERE id = $1", [planId]);
      }
      await (await getRedisClient())!.del(`stats:${userId}`);
    }
  });

  test("versioned workout logging persists and enforces ownership and completion", async () => {
    const created = await request(app)
      .post("/api/v1/workout-sessions")
      .auth(token, { type: "bearer" })
      .send({ title: "Integration workout" })
      .expect(201);
    const id = created.body.data.session.id;
    await request(app).get(`/api/v1/workout-sessions/${id}`).auth(otherToken, { type: "bearer" }).expect(404);
    await request(app)
      .post(`/api/v1/workout-sessions/${id}/logs`)
      .auth(token, { type: "bearer" })
      .send({ exerciseId, actualReps: 10, actualWeightKg: 20 })
      .expect(201);
    const detail = await request(app).get(`/api/v1/workout-sessions/${id}`).auth(token, { type: "bearer" }).expect(200);
    expect(detail.body.data.session.logs).toHaveLength(1);
    await request(app)
      .patch(`/api/v1/workout-sessions/${id}`)
      .auth(token, { type: "bearer" })
      .send({ completed: true })
      .expect(200);
    await request(app)
      .post(`/api/v1/workout-sessions/${id}/logs`)
      .auth(token, { type: "bearer" })
      .send({ exerciseId, actualReps: 10 })
      .expect(404);
    const stats = await request(app).get("/api/v1/workout-sessions/stats").auth(token, { type: "bearer" }).expect(200);
    expect(stats.body.data).toMatchObject({ totalSessions: 1, totalVolumeKg: 200 });
  });
});
