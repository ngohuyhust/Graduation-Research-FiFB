import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe, uuidParamSchema } from "../../common/zod-validation.pipe";
import { TrainersService } from "./trainers.service";
import { trainerProfileSchema, trainerQuerySchema } from "./trainers.validation";
import type { TrainerProfilePayload, TrainerQuery } from "./trainers.validation";

@Controller("trainers")
export class TrainersController {
  constructor(private readonly service: TrainersService) {}

  @Get()
  async list(@Query(new ZodValidationPipe(trainerQuerySchema)) query: TrainerQuery) {
    return { success: true, data: await this.service.listTrainers(query), message: "OK" };
  }

  @Put("me/profile")
  @UseGuards(AuthGuard)
  @Roles("trainer")
  async saveMe(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(trainerProfileSchema)) body: TrainerProfilePayload,
  ) {
    return {
      success: true,
      data: await this.service.saveOwnProfile(req.auth.userId, body),
      message: "Trainer profile saved",
    };
  }

  @Get(":id")
  async detail(@Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string }) {
    return { success: true, data: await this.service.getTrainer(id), message: "OK" };
  }
}
