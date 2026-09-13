import { Controller, Get, HttpCode, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe, uuidParamSchema } from "../../common/zod-validation.pipe";
import { notificationQuerySchema } from "./notifications.validation";
import type { NotificationQuery } from "./notifications.validation";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get("")
  async list(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(notificationQuerySchema)) query: NotificationQuery,
  ) {
    return { success: true, data: await this.service.listMine(req.auth.userId, query), message: "OK" };
  }

  @Patch("read-all")
  @HttpCode(204)
  async markAllRead(@Req() req: AuthenticatedRequest) {
    await this.service.markAllRead(req.auth.userId);
  }

  @Patch(":id/read")
  async markRead(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
  ) {
    return {
      success: true,
      data: await this.service.markRead(req.auth.userId, id),
      message: "Notification marked read",
    };
  }
}
