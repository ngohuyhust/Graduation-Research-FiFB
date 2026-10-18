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
    expect(migrations.rows.map((row) => row.version)).toEqual(["1", "2"]);
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
