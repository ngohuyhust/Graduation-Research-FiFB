import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthGuard } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./auth.validation";
import type {
  RegisterPayload,
  LoginPayload,
  VerifyEmailPayload,
  RequestPasswordResetPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
} from "./auth.validation";
const { publicUser } = require("../users/users.presenter");
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { getRefreshTokenCookie, setRefreshTokenCookie, clearRefreshTokenCookie } = require("./refreshCookie");

function meta(req: Request) {
  return { ipAddress: req.ip, userAgent: req.get("user-agent") };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post("register")
  async register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterPayload) {
    const result = await this.service.register(body);
    return {
      success: true,
      data: { user: publicUser(result.user) },
      message: "Registration created. Check email to verify account.",
    };
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.service.login(body, meta(req));
    setRefreshTokenCookie(res, tokens.refreshToken, tokens.expiresAt);
    return {
      success: true,
      data: { accessToken: tokens.accessToken, expiresAt: tokens.expiresAt },
      message: "Logged in",
    };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getRefreshTokenCookie(req);
    if (!refreshToken) throw new AppError(codes.UNAUTHENTICATED, "Missing refresh token", 401);
    const tokens = await this.service.refresh(refreshToken, meta(req));
    setRefreshTokenCookie(res, tokens.refreshToken, tokens.expiresAt);
    return {
      success: true,
      data: { accessToken: tokens.accessToken, expiresAt: tokens.expiresAt },
      message: "Token refreshed",
    };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getRefreshTokenCookie(req);
    if (refreshToken) await this.service.logout(refreshToken);
    clearRefreshTokenCookie(res);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() req: AuthenticatedRequest & { user: unknown }) {
    return { success: true, data: { user: publicUser(req.user) }, message: "OK" };
  }

  @Post("verify-email")
  @HttpCode(200)
  async verifyEmail(@Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailPayload) {
    const result = await this.service.verifyEmail(body.email, body.otp);
    return { success: true, data: { user: publicUser(result.user) }, message: "Email verified" };
  }

  @Post("request-password-reset")
  @HttpCode(200)
  async requestPasswordReset(
    @Body(new ZodValidationPipe(requestPasswordResetSchema)) body: RequestPasswordResetPayload,
  ) {
    await this.service.requestPasswordReset(body.email);
    return { success: true, data: null, message: "If the email exists, a reset link has been sent" };
  }

  @Post("reset-password")
  @HttpCode(204)
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordPayload) {
    await this.service.resetPassword(body.token, body.newPassword);
  }

  @Post("change-password")
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordPayload,
  ) {
    await this.service.changePassword(req.auth.userId, body.currentPassword, body.newPassword);
  }
}
