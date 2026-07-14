const { query } = require("../../db/pool");
const { env } = require("../../config/env");
const { getRedisClient } = require("../../redis/client");

const memory = {
  sessions: new Map(),
  userSessions: new Map(),
  emailVerificationTokens: new Map(),
  passwordResetTokens: new Map(),
};

function secondsUntil(date) {
  return Math.max(1, Math.floor((new Date(date).getTime() - Date.now()) / 1000));
}

function isExpired(record) {
  return !record || new Date(record.expires_at).getTime() <= Date.now();
}

function assertMemoryAuthStoreAllowed() {
  if (env.nodeEnv === "production") {
    throw new Error("Persistent Redis auth store is required in production");
  }
}

async function redisSetJson(key, value, ttlSeconds) {
  const redis = await getRedisClient();
  if (!redis) return false;
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  return true;
}

async function redisGetJson(key) {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function redisDelete(key) {
  const redis = await getRedisClient();
  if (!redis) return false;
  await redis.del(key);
  return true;
}

async function createSession(_client, { userId, refreshTokenHash, expiresAt, ipAddress, userAgent }) {
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
  memory.sessions.set(refreshTokenHash, record);
  const hashes = memory.userSessions.get(userId) || new Set();
  hashes.add(refreshTokenHash);
  memory.userSessions.set(userId, hashes);
  return record;
}

async function findSessionByHash(_client, refreshTokenHash) {
  let session = await redisGetJson(`session:${refreshTokenHash}`);
  if (!session) session = memory.sessions.get(refreshTokenHash);
  if (isExpired(session) || session.revoked_at) return null;
  const user = await query(
    `SELECT id, role, status, email, email_verified_at FROM app_users WHERE id = $1 AND deleted_at IS NULL`,
    [session.user_id],
  );
  if (!user.rows[0]) return null;
  return { ...session, ...user.rows[0], user_id: session.user_id };
}

async function revokeSessionByHash(_client, refreshTokenHash) {
  const session = await redisGetJson(`session:${refreshTokenHash}`);
  if (session) {
    await redisDelete(`session:${refreshTokenHash}`);
    return;
  }
  memory.sessions.delete(refreshTokenHash);
}

async function revokeUserSessions(_client, userId) {
  const redis = await getRedisClient();
  if (redis) {
    const hashes = await redis.sMembers(`user_sessions:${userId}`);
    if (hashes.length) await redis.del(hashes.map((hash) => `session:${hash}`));
    await redis.del(`user_sessions:${userId}`);
    return;
  }
  const hashes = memory.userSessions.get(userId) || new Set();
  for (const hash of hashes) memory.sessions.delete(hash);
  memory.userSessions.delete(userId);
}

async function createVerificationToken(_client, { userId, tokenHash, expiresAt }) {
  const record = { id: tokenHash, user_id: userId, token_hash: tokenHash, expires_at: expiresAt.toISOString() };
  if (await redisSetJson(`email_verification:${tokenHash}`, record, secondsUntil(expiresAt))) return;
  assertMemoryAuthStoreAllowed();
  memory.emailVerificationTokens.set(tokenHash, record);
}

async function findVerificationToken(_client, tokenHash) {
  let record = await redisGetJson(`email_verification:${tokenHash}`);
  if (!record) record = memory.emailVerificationTokens.get(tokenHash);
  return isExpired(record) ? null : record;
}

async function markVerificationUsed(_client, id) {
  if (await redisDelete(`email_verification:${id}`)) return;
  memory.emailVerificationTokens.delete(id);
}

async function createPasswordResetToken(_client, { userId, tokenHash, expiresAt }) {
  const record = { id: tokenHash, user_id: userId, token_hash: tokenHash, expires_at: expiresAt.toISOString() };
  if (await redisSetJson(`password_reset:${tokenHash}`, record, secondsUntil(expiresAt))) return;
  assertMemoryAuthStoreAllowed();
  memory.passwordResetTokens.set(tokenHash, record);
}

async function findPasswordResetToken(_client, tokenHash) {
  let record = await redisGetJson(`password_reset:${tokenHash}`);
  if (!record) record = memory.passwordResetTokens.get(tokenHash);
  return isExpired(record) ? null : record;
}

async function markPasswordResetUsed(_client, id) {
  if (await redisDelete(`password_reset:${id}`)) return;
  memory.passwordResetTokens.delete(id);
}

async function cleanupExpiredTokens() {
  for (const [hash, record] of memory.emailVerificationTokens.entries()) {
    if (isExpired(record)) memory.emailVerificationTokens.delete(hash);
  }
  for (const [hash, record] of memory.passwordResetTokens.entries()) {
    if (isExpired(record)) memory.passwordResetTokens.delete(hash);
  }
  for (const [hash, record] of memory.sessions.entries()) {
    if (isExpired(record)) memory.sessions.delete(hash);
  }
}

module.exports = {
  createSession,
  findSessionByHash,
  revokeSessionByHash,
  revokeUserSessions,
  createVerificationToken,
  findVerificationToken,
  markVerificationUsed,
  createPasswordResetToken,
  findPasswordResetToken,
  markPasswordResetUsed,
  cleanupExpiredTokens,
};
