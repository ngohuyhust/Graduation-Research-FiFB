import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe, uuidParamSchema } from "../../common/zod-validation.pipe";
import { UsersService } from "./users.service";
import { statusSchema, updateProfileSchema, usersQuerySchema } from "./users.validation";
import type { UpdateProfile, UsersQuery, UserStatus } from "./users.validation";

@Controller("users")
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get("me")
  async me(@Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.service.getOwnProfile(req.user), message: "OK" };
  }

  @Patch("me")
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfile,
  ) {
    return {
      success: true,
      data: await this.service.updateOwnProfile(req.auth.userId, body),
      message: "Profile updated",
    };
  }

  @Get()
  @Roles("admin")
  async list(@Query(new ZodValidationPipe(usersQuerySchema)) query: UsersQuery) {
    return { success: true, data: await this.service.listUsers(query), message: "OK" };
  }

  @Patch(":id/status")
  @Roles("admin")
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
    @Body(new ZodValidationPipe(statusSchema)) body: { status: UserStatus },
  ) {
    return {
      success: true,
      data: await this.service.updateUserStatus(req.auth, id, body.status, {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      }),
      message: "User status updated",
    };
  }

  @Get(":id")
  @Roles("admin")
  async getById(@Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string }) {
    return { success: true, data: await this.service.getUserById(id), message: "OK" };
  }
}
