const bcrypt = require("bcryptjs");
const { env } = require("../../config/env");
const { withTransaction } = require("../../db/pool");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { createOpaqueToken, hashToken, addDays, addHours, addMinutes } = require("../../utils/tokens");
const userRepository = require("../users/users.repository");
const authRepository = require("./auth.repository");
const { signAccessToken } = require("./jwt.service");
const { sendEmail } = require("../emailDeliveries/emailDeliveries.repository");

function sanitizeEmail(email) {
  return email.trim().toLowerCase();
}

async function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptRounds);
}

async function createTokenPair(client, user, reqMeta) {
  const refreshToken = createOpaqueToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = addDays(new Date(), env.refreshTokenTtlDays);
  await authRepository.createSession(client, {
    userId: user.id,
    refreshTokenHash,
    expiresAt,
    ipAddress: reqMeta.ipAddress,
    userAgent: reqMeta.userAgent,
  });
  return {
    accessToken: signAccessToken(user),
    refreshToken,
    expiresAt,
  };
}

async function register(payload, _reqMeta) {
  return withTransaction(async (client) => {
    const email = sanitizeEmail(payload.email);
    const existing = await userRepository.findByEmail(email, client);
    if (existing) throw new AppError(codes.CONFLICT, "Email is already registered", 409);

    const user = await userRepository.createUser(client, {
      ...payload,
      email,
      passwordHash: await hashPassword(payload.password),
      status: "pending_verification",
    });

    if (payload.role === "trainer") {
      await client.query(`INSERT INTO trainer_profiles (trainer_id) VALUES ($1)`, [user.id]);
    }

    const verificationToken = createOpaqueToken();
    await authRepository.createVerificationToken(client, {
      userId: user.id,
      tokenHash: hashToken(verificationToken),
      expiresAt: addHours(new Date(), env.emailVerificationTtlHours),
    });

    const verifyUrl = `${env.frontendUrl}/verify-email?token=${verificationToken}`;
    await sendEmail(client, {
      to: user.email,
      subject: "Verify your FiFB account",
      text: `Verify your account: ${verifyUrl}`,
      html: `<p>Verify your FiFB account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
      templateKey: "email_verification",
      metadata: { userId: user.id },
    });

    return { user };
  });
}

async function login(payload, reqMeta) {
  const user = await userRepository.findByEmail(sanitizeEmail(payload.email));
  if (!user) throw new AppError(codes.UNAUTHENTICATED, "Invalid email or password", 401);
  const ok = await bcrypt.compare(payload.password, user.password_hash);
  if (!ok) throw new AppError(codes.UNAUTHENTICATED, "Invalid email or password", 401);
  if (user.status !== "active") throw new AppError(codes.FORBIDDEN, `Account status is ${user.status}`, 403);
  if (!user.email_verified_at) throw new AppError(codes.FORBIDDEN, "Email verification required", 403);
  await userRepository.touchLastLogin(user.id);
  return withTransaction(async (client) => createTokenPair(client, user, reqMeta));
}

async function refresh(refreshToken, reqMeta) {
  return withTransaction(async (client) => {
    const currentHash = hashToken(refreshToken);
    const session = await authRepository.findSessionByHash(client, currentHash);
    if (!session) throw new AppError(codes.UNAUTHENTICATED, "Invalid refresh token", 401);
    if (session.status !== "active") throw new AppError(codes.FORBIDDEN, "Account is not active", 403);
    await authRepository.revokeSessionByHash(client, currentHash);
    return createTokenPair(client, { id: session.user_id, role: session.role, status: session.status }, reqMeta);
  });
}

async function logout(refreshToken) {
  return withTransaction(async (client) => {
    await authRepository.revokeSessionByHash(client, hashToken(refreshToken));
  });
}

async function verifyEmail(token) {
  return withTransaction(async (client) => {
    const record = await authRepository.findVerificationToken(client, hashToken(token));
    if (!record) throw new AppError(codes.BAD_REQUEST, "Invalid or expired verification token", 400);
    await authRepository.markVerificationUsed(client, record.id);
    const user = await userRepository.markVerified(client, record.user_id);
    return { user };
  });
}

async function requestPasswordReset(email) {
  const user = await userRepository.findByEmail(sanitizeEmail(email));
  if (!user) return;
  await withTransaction(async (client) => {
    const token = createOpaqueToken();
    await authRepository.createPasswordResetToken(client, {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: addMinutes(new Date(), env.passwordResetTtlMinutes),
    });
    const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;
    await sendEmail(client, {
      to: user.email,
      subject: "Reset your FiFB password",
      text: `Reset your password: ${resetUrl}`,
      html: `<p>Reset your FiFB password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      templateKey: "password_reset",
      metadata: { userId: user.id },
    });
  });
}

async function resetPassword(token, newPassword) {
  return withTransaction(async (client) => {
    const record = await authRepository.findPasswordResetToken(client, hashToken(token));
    if (!record) throw new AppError(codes.BAD_REQUEST, "Invalid or expired reset token", 400);
    await userRepository.updatePassword(client, record.user_id, await hashPassword(newPassword));
    await authRepository.markPasswordResetUsed(client, record.id);
    await authRepository.revokeUserSessions(client, record.user_id);
  });
}

async function changePassword(userId, currentPassword, newPassword) {
  return withTransaction(async (client) => {
    const user = await userRepository.findAuthById(userId, client);
    const ok = user && await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw new AppError(codes.UNAUTHENTICATED, "Current password is incorrect", 401);
    await userRepository.updatePassword(client, userId, await hashPassword(newPassword));
    await authRepository.revokeUserSessions(client, userId);
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
};
