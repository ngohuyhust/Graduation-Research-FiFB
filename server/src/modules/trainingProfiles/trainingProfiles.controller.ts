import { Body, Controller, Get, Put, Req, UseGuards, Header } from "@nestjs/common";
import { AuthGuard, Roles, type AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { TrainingProfilesService } from "./trainingProfiles.service";
import { trainingProfileSchema, type TrainingProfile } from "./trainingProfiles.validation";

@Controller({ path: "users/me/training-profile", version: "1" })
@UseGuards(AuthGuard)
@Roles("user")
export class TrainingProfilesController {
  constructor(private readonly service: TrainingProfilesService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  async get(@Req() req: AuthenticatedRequest) {
    return { success: true, data: { profile: await this.service.get(req.auth.userId) }, message: "OK" };
  }

  @Put()
  @Header("Cache-Control", "no-store")
  async save(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(trainingProfileSchema)) body: TrainingProfile,
  ) {
    return {
      success: true,
      data: { profile: await this.service.save(req.auth.userId, body) },
      message: "Training profile saved",
    };
  }
}
