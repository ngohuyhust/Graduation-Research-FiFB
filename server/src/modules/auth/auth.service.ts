import { UsersRepository } from "../users/users.repository";
import { Inject, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type * as AuthRepository from "./auth.repository";
import type { RegisterPayload, LoginPayload } from "./auth.validation";
import type { RequestMeta, TokenUser } from "./auth.types";

export const AUTH_REPOSITORY = Symbol("AUTH_REPOSITORY");

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { env } = require("../../config/env");
const { withTransaction } = require("../../db/pool");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { logger } = require("../../utils/logger");
const { createOpaqueToken, hashToken, addDays, addHours, addMinutes } = require("../../utils/tokens");
const { signAccessToken } = require("./jwt.service");
import { EmailDeliveriesRepository } from "../emailDeliveries/emailDeliveries.repository";

function sanitizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function maskEmail(email = "") {
  const [local = "", domain = ""] = email.split("@");
  const maskedLocal = local.length <= 2 ? `${local.slice(0, 1)}***` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  const [domainName = "", ...domainRest] = domain.split(".");
  const maskedDomain = domainName ? `${domainName.slice(0, 1)}***` : "***";
  return domain ? `${maskedLocal}@${[maskedDomain, ...domainRest].filter(Boolean).join(".")}` : maskedLocal;
}

function loginDebugContext(email: string, user?: TokenUser, passwordMatches?: boolean) {
  return {
    email: maskEmail(email),
    userId: user?.id || null,
    status: user?.status || null,
    verified: user ? Boolean(user.email_verified_at) : null,
    passwordChecked: typeof passwordMatches === "boolean",
  };
}

function logLoginDebug(reason: string, context: Record<string, unknown>) {
  if (!env.authDebugLogin) return;
  logger.warn("Auth login debug", { reason, ...context });
}

function createEmailOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

function hashEmailOtp(email: string, otp: string) {
  return hashToken(`${sanitizeEmail(email)}:${otp}`);
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, env.bcryptRounds);
}

@Injectable()
export class AuthService {
  constructor(private readonly emailDeliveries: EmailDeliveriesRepository,
    @Inject(AUTH_REPOSITORY) private readonly authRepository: typeof AuthRepository,
    private readonly userRepository: UsersRepository,
  ) {}

  private async createTokenPair(client: PoolClient, user: TokenUser, reqMeta: RequestMeta) {
    const refreshToken = createOpaqueToken();
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = addDays(new Date(), env.refreshTokenTtlDays);
    await this.authRepository.createSession(client, {
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

  async register(payload: RegisterPayload) {
    const result = await withTransaction(async (client: PoolClient) => {
      const email = sanitizeEmail(payload.email);
      const existing = await this.userRepository.findByEmail(email, client);
      if (existing) throw new AppError(codes.CONFLICT, "Email is already registered", 409);

      const user = await this.userRepository.createUser(client, {
        ...payload,
        email,
        passwordHash: await hashPassword(payload.password),
        status: "pending_verification",
      });

      if (payload.role === "trainer") {
        await client.query(`INSERT INTO trainer_profiles (trainer_id) VALUES ($1)`, [user.id]);
      }

      const verificationOtp = createEmailOtp();
      await this.authRepository.createVerificationToken(client, {
        userId: user.id,
        tokenHash: hashEmailOtp(user.email, verificationOtp),
        expiresAt: addHours(new Date(), env.emailVerificationTtlHours),
      });

      const verifyUrl = `${env.frontendUrl}/verify-email?email=${encodeURIComponent(user.email)}`;
      const verificationEmail = {
        to: user.email,
        subject: "Verify your FiFB account",
        text: `Your FiFB verification code is ${verificationOtp}. Enter it here: ${verifyUrl}`,
        html: `<p>Your FiFB verification code is:</p><p><strong>${verificationOtp}</strong></p><p>Enter it here: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
        templateKey: "email_verification",
        metadata: { userId: user.id },
      };

      return { user, verificationEmail };
    });
    await this.emailDeliveries.sendEmail(null, result.verificationEmail);
    return { user: result.user };
  }

  async login(payload: LoginPayload, reqMeta: RequestMeta) {
    const email = sanitizeEmail(payload.email);

    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        logLoginDebug("user_not_found", loginDebugContext(email));
        throw new AppError(codes.UNAUTHENTICATED, "Invalid email or password", 401);
      }

      const ok = await bcrypt.compare(payload.password, user.password_hash);
      if (!ok) {
        logLoginDebug("password_mismatch", loginDebugContext(email, user, ok));
        throw new AppError(codes.UNAUTHENTICATED, "Invalid email or password", 401);
      }

      if (user.status !== "active") {
        logLoginDebug("account_not_active", loginDebugContext(email, user, ok));
        throw new AppError(codes.FORBIDDEN, `Account status is ${user.status}`, 403);
      }

      if (!user.email_verified_at) {
        logLoginDebug("email_not_verified", loginDebugContext(email, user, ok));
        throw new AppError(codes.FORBIDDEN, "Email verification required", 403);
      }

      await this.userRepository.touchLastLogin(user.id);
      return withTransaction(async (client: PoolClient) => this.createTokenPair(client, user, reqMeta));
    } catch (error) {
      if (!(error instanceof AppError)) {
        logLoginDebug("unexpected_error", {
          email: maskEmail(email),
          message: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }

  async refresh(refreshToken: string, reqMeta: RequestMeta) {
    return withTransaction(async (client: PoolClient) => {
      const currentHash = hashToken(refreshToken);
      const session = await this.authRepository.findSessionByHash(client, currentHash);
      if (!session) throw new AppError(codes.UNAUTHENTICATED, "Invalid refresh token", 401);
      if (session.status !== "active") throw new AppError(codes.FORBIDDEN, "Account is not active", 403);
      if (!session.email_verified_at) throw new AppError(codes.FORBIDDEN, "Email verification required", 403);
      await this.authRepository.revokeSessionByHash(client, currentHash);
      return this.createTokenPair(client, { id: session.user_id, role: session.role, status: session.status }, reqMeta);
    });
  }

  async logout(refreshToken: string) {
    return withTransaction(async (client: PoolClient) => {
      await this.authRepository.revokeSessionByHash(client, hashToken(refreshToken));
    });
  }

  async verifyEmail(email: string, otp: string) {
    return withTransaction(async (client: PoolClient) => {
      const record = await this.authRepository.findVerificationToken(client, hashEmailOtp(email, otp));
      if (!record) throw new AppError(codes.BAD_REQUEST, "Invalid or expired verification code", 400);
      await this.authRepository.markVerificationUsed(client, record.id);
      const user = await this.userRepository.markVerified(client, record.user_id);
      return { user };
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findByEmail(sanitizeEmail(email));
    if (!user) return;
    const resetEmail = await withTransaction(async (client: PoolClient) => {
      const token = createOpaqueToken();
      await this.authRepository.createPasswordResetToken(client, {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: addMinutes(new Date(), env.passwordResetTtlMinutes),
      });
      const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;
      return {
        to: user.email,
        subject: "Reset your FiFB password",
        text: `Reset your password: ${resetUrl}`,
        html: `<p>Reset your FiFB password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
        templateKey: "password_reset",
        metadata: { userId: user.id },
      };
    });
    await this.emailDeliveries.sendEmail(null, resetEmail);
  }

  async resetPassword(token: string, newPassword: string) {
    return withTransaction(async (client: PoolClient) => {
      const record = await this.authRepository.findPasswordResetToken(client, hashToken(token));
      if (!record) throw new AppError(codes.BAD_REQUEST, "Invalid or expired reset token", 400);
      await this.userRepository.updatePassword(client, record.user_id, await hashPassword(newPassword));
      await this.authRepository.markPasswordResetUsed(client, record.id);
      await this.authRepository.revokeUserSessions(client, record.user_id);
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    return withTransaction(async (client: PoolClient) => {
      const user = await this.userRepository.findAuthById(userId, client);
      const ok = user && (await bcrypt.compare(currentPassword, user.password_hash));
      if (!ok) throw new AppError(codes.UNAUTHENTICATED, "Current password is incorrect", 401);
      await this.userRepository.updatePassword(client, userId, await hashPassword(newPassword));
      await this.authRepository.revokeUserSessions(client, userId);
    });
  }
}
