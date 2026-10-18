import { Body, Controller, Header, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { loginSchema, mobileRefreshSchema } from "./auth.validation";
import type { LoginPayload, MobileRefreshPayload } from "./auth.validation";

// Native clients store refresh tokens in OS secure storage. Browser clients keep
// using /auth with HTTP-only cookies; these routes never read or issue cookies.
@Controller({ path: "auth/mobile", version: "1" })
export class MobileAuthController {
  constructor(private readonly service: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  async login(@Body(new ZodValidationPipe(loginSchema)) body: LoginPayload, @Req() req: Request) {
    const tokens = await this.service.login(body, { ipAddress: req.ip, userAgent: req.get("user-agent") });
    return { success: true, data: tokens, message: "Logged in" };
  }

  @Post("refresh")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  async refresh(@Body(new ZodValidationPipe(mobileRefreshSchema)) body: MobileRefreshPayload, @Req() req: Request) {
    const tokens = await this.service.refresh(body.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return { success: true, data: tokens, message: "Token refreshed" };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Body(new ZodValidationPipe(mobileRefreshSchema)) body: MobileRefreshPayload) {
    await this.service.logout(body.refreshToken);
  }
}
