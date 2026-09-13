import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe, uuidParamSchema } from "../../common/zod-validation.pipe";
import { paginationQuery } from "../../utils/validators/commonSchemas";
type Pagination = { page: number; limit: number };
import { createSessionSchema, exerciseLogSchema, exerciseParam, updateSessionSchema } from "./workoutSessions.validation";
import type { CreateSession, ExerciseLog, ExerciseParam, UpdateSession } from "./workoutSessions.validation";
import { WorkoutSessionsService } from "./workoutSessions.service";

@Controller("workout-sessions")
@UseGuards(AuthGuard)
@Roles("user", "trainer")
export class WorkoutSessionsController {
  constructor(private readonly service: WorkoutSessionsService) {}

  @Get("")
  async list(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(paginationQuery)) query: Pagination
  ) {
    return { success: true, data: await this.service.list(req.auth.userId, query), message: "OK" };
  }

  @Post("")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createSessionSchema)) body: CreateSession
  ) {
    return { success: true, data: await this.service.create(req.auth.userId, body), message: "Workout session started" };
  }

  @Get("stats")
  async stats(
    @Req() req: AuthenticatedRequest
  ) {
    return { success: true, data: await this.service.stats(req.auth.userId), message: "OK" };
  }

  @Get("progression/:exerciseId")
  async progression(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(exerciseParam)) { exerciseId }: ExerciseParam
  ) {
    return { success: true, data: await this.service.progression(req.auth.userId, exerciseId), message: "OK" };
  }

  @Get(":id")
  async detail(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string }
  ) {
    return { success: true, data: await this.service.detail(req.auth.userId, id), message: "OK" };
  }

  @Patch(":id")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
    @Body(new ZodValidationPipe(updateSessionSchema)) body: UpdateSession
  ) {
    return { success: true, data: await this.service.update(req.auth.userId, id, body), message: "Workout session updated" };
  }

  @Post(":id/logs")
  async addLog(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
    @Body(new ZodValidationPipe(exerciseLogSchema)) body: ExerciseLog
  ) {
    return { success: true, data: await this.service.addLog(req.auth.userId, id, body), message: "Exercise log added" };
  }
}
