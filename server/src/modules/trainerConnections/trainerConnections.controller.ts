import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe, uuidParamSchema } from "../../common/zod-validation.pipe";
import { TrainerConnectionsService } from "./trainerConnections.service";
import { connectionRequestSchema, rejectConnectionSchema } from "./trainerConnections.validation";
import type { ConnectionRequestPayload, RejectConnectionPayload } from "./trainerConnections.validation";

@Controller("trainer-connection-requests")
@UseGuards(AuthGuard)
export class TrainerConnectionsController {
  constructor(private readonly service: TrainerConnectionsService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.service.listRequests(req.user), message: "OK" };
  }

  @Get("connections")
  async listConnections(@Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.service.listConnections(req.user), message: "OK" };
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(connectionRequestSchema)) body: ConnectionRequestPayload,
  ) {
    return {
      success: true,
      data: await this.service.sendRequest(req.auth.userId, body),
      message: "Trainer connection request sent",
    };
  }

  @Patch(":id/cancel")
  async cancel(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
  ) {
    return { success: true, data: await this.service.cancelRequest(req.auth.userId, id), message: "Request cancelled" };
  }

  @Patch(":id/approve")
  @Roles("trainer")
  async approve(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
  ) {
    return { success: true, data: await this.service.decide(req.auth, id, "approved"), message: "Request approved" };
  }

  @Patch(":id/reject")
  @Roles("trainer")
  async reject(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
    @Body(new ZodValidationPipe(rejectConnectionSchema)) body: RejectConnectionPayload,
  ) {
    return {
      success: true,
      data: await this.service.decide(req.auth, id, "rejected", body.rejectReason),
      message: "Request rejected",
    };
  }
}
