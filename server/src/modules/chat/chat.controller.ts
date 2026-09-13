import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { connectionParam, messageQuery, messageSchema } from "./chat.validation";
import type { ConnectionParam, MessagePayload, MessageQuery } from "./chat.validation";
import { ChatService } from "./chat.service";

@Controller("chat")
@UseGuards(AuthGuard)
@Roles("user", "trainer")
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get("unread")
  async unread(
    @Req() req: AuthenticatedRequest
  ) {
    return { success: true, data: await this.service.unread(req.auth.userId), message: "OK" };
  }

  @Get(":connectionId/messages")
  async list(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(connectionParam)) { connectionId }: ConnectionParam,
    @Query(new ZodValidationPipe(messageQuery)) query: MessageQuery
  ) {
    return { success: true, data: await this.service.list(req.auth.userId, connectionId, query), message: "OK" };
  }

  @Post(":connectionId/messages")
  async send(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(connectionParam)) { connectionId }: ConnectionParam,
    @Body(new ZodValidationPipe(messageSchema)) body: MessagePayload
  ) {
    return { success: true, data: await this.service.send(req.auth.userId, connectionId, body), message: "Message sent" };
  }

  @Patch(":connectionId/read")
  async markRead(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(connectionParam)) { connectionId }: ConnectionParam
  ) {
    return { success: true, data: await this.service.markRead(req.auth.userId, connectionId), message: "Messages marked read" };
  }
}
