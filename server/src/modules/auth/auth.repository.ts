import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { QueryExecutor } from "../../db/database.service";
import type { StoredSession, StoredToken, SessionPayload, TokenPayload } from "./auth-persistence.types";
const { env } = require("../../config/env");
const { getRedisClient } = require("../../redis/client");



export function secondsUntil(date: Date | string) {
  return Math.max(1, Math.floor((new Date(date).getTime() - Date.now()) / 1000));
}

export function isExpired(record: { expires_at: string } | null | undefined) {
  return !record || new Date(record.expires_at).getTime() <= Date.now();
}

export function assertMemoryAuthStoreAllowed() {
  if (env.nodeEnv === "production") {
    throw new Error("Persistent Redis auth store is required in production");
  }
}

export async function redisSetJson(key: string, value: StoredSession | StoredToken, ttlSeconds: number) {
  const redis = await getRedisClient();
  if (!redis) return false;
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  return true;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}

export async function redisDelete(key: string) {
  const redis = await getRedisClient();
  if (!redis) return false;
  await redis.del(key);
  return true;
}

@Injectable()
export class AuthRepository {
  private readonly memory = {
    sessions: new Map<string, StoredSession>(),
    userSessions: new Map<string, Set<string>>(),
    emailVerificationTokens: new Map<string, StoredToken>(),
    passwordResetTokens: new Map<string, StoredToken>(),
  };
  constructor(private readonly db: DatabaseService) {}

  async createSession(_client: QueryExecutor, { userId, refreshTokenHash, expiresAt, ipAddress, userAgent }: SessionPayload) {
    const record = {
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt.toISOString(),
      revoked_at: null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      created_at: new Date().toISOString(),
    };
    if (await redisSetJson(`session:${refreshTokenHash}`, record, secondsUntil(expiresAt))) {
      const redis = await getRedisClient();
      await redis.sAdd(`user_sessions:${userId}`, refreshTokenHash);
      return record;
    }
    assertMemoryAuthStoreAllowed();
    this.memory.sessions.set(refreshTokenHash, record);
    const hashes = this.memory.userSessions.get(userId) || new Set();
    hashes.add(refreshTokenHash);
    this.memory.userSessions.set(userId, hashes);
    return record;
  }

  async findSessionByHash(_client: QueryExecutor, refreshTokenHash: string) {
    let session = await redisGetJson<StoredSession>(`session:${refreshTokenHash}`);
    if (!session) session = this.memory.sessions.get(refreshTokenHash) || null;
    if (!session || isExpired(session) || session.revoked_at) return null;
    const user = await this.db.query<{ id: string; role: string; status: string; email: string; email_verified_at: Date | null }>(
      `SELECT id, role, status, email, email_verified_at FROM app_users WHERE id = $1 AND deleted_at IS NULL`,
      [session.user_id],
    );
    if (!user.rows[0]) return null;
    return { ...session, ...user.rows[0], user_id: session.user_id };
  }

  async revokeSessionByHash(_client: QueryExecutor, refreshTokenHash: string) {
    const session = await redisGetJson<StoredSession>(`session:${refreshTokenHash}`);
    if (session) {
      await redisDelete(`session:${refreshTokenHash}`);
      return;
    }
    this.memory.sessions.delete(refreshTokenHash);
  }

  async revokeUserSessions(_client: QueryExecutor, userId: string) {
    const redis = await getRedisClient();
    if (redis) {
      const hashes = await redis.sMembers(`user_sessions:${userId}`);
      if (hashes.length) await redis.del(hashes.map((hash: string) => `session:${hash}`));
      await redis.del(`user_sessions:${userId}`);
      return;
    }
    const hashes = this.memory.userSessions.get(userId) || new Set();
    for (const hash of hashes) this.memory.sessions.delete(hash);
    this.memory.userSessions.delete(userId);
  }

  async createVerificationToken(_client: QueryExecutor, { userId, tokenHash, expiresAt }: TokenPayload) {
    const record = { id: tokenHash, user_id: userId, token_hash: tokenHash, expires_at: expiresAt.toISOString() };
    if (await redisSetJson(`email_verification:${tokenHash}`, record, secondsUntil(expiresAt))) return;
    assertMemoryAuthStoreAllowed();
    this.memory.emailVerificationTokens.set(tokenHash, record);
  }

  async findVerificationToken(_client: QueryExecutor, tokenHash: string) {
    let record = await redisGetJson<StoredToken>(`email_verification:${tokenHash}`);
    if (!record) record = this.memory.emailVerificationTokens.get(tokenHash) || null;
    return isExpired(record) ? null : record;
  }

  async markVerificationUsed(_client: QueryExecutor, id: string) {
    if (await redisDelete(`email_verification:${id}`)) return;
    this.memory.emailVerificationTokens.delete(id);
  }

  async createPasswordResetToken(_client: QueryExecutor, { userId, tokenHash, expiresAt }: TokenPayload) {
    const record = { id: tokenHash, user_id: userId, token_hash: tokenHash, expires_at: expiresAt.toISOString() };
    if (await redisSetJson(`password_reset:${tokenHash}`, record, secondsUntil(expiresAt))) return;
    assertMemoryAuthStoreAllowed();
    this.memory.passwordResetTokens.set(tokenHash, record);
  }

  async findPasswordResetToken(_client: QueryExecutor, tokenHash: string) {
    let record = await redisGetJson<StoredToken>(`password_reset:${tokenHash}`);
    if (!record) record = this.memory.passwordResetTokens.get(tokenHash) || null;
    return isExpired(record) ? null : record;
  }

  async markPasswordResetUsed(_client: QueryExecutor, id: string) {
    if (await redisDelete(`password_reset:${id}`)) return;
    this.memory.passwordResetTokens.delete(id);
  }

  async cleanupExpiredTokens() {
    for (const [hash, record] of this.memory.emailVerificationTokens.entries()) {
      if (isExpired(record)) this.memory.emailVerificationTokens.delete(hash);
    }
    for (const [hash, record] of this.memory.passwordResetTokens.entries()) {
      if (isExpired(record)) this.memory.passwordResetTokens.delete(hash);
    }
    for (const [hash, record] of this.memory.sessions.entries()) {
      if (isExpired(record)) this.memory.sessions.delete(hash);
    }
  }
}
