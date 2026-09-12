import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ResponseCache, ResponseCacheInterceptor } from "../../common/response-cache.interceptor";
import { ZodValidationPipe, uuidParamSchema } from "../../common/zod-validation.pipe";
import { ExercisesService } from "./exercises.service";
import {
  exercisePayloadSchema,
  exerciseQuerySchema,
  exerciseUpdateSchema,
  reviewDecisionSchema,
} from "./exercises.validation";
import type { ExercisePayload, ExerciseQuery, ExerciseUpdate, ReviewDecision } from "./exercises.validation";

@Controller("exercises")
export class ExercisesController {
  constructor(private readonly service: ExercisesService) {}

  @Get()
  @UseInterceptors(ResponseCacheInterceptor)
  @ResponseCache(300, "exercises")
  async list(@Query(new ZodValidationPipe(exerciseQuerySchema)) query: ExerciseQuery) {
    return { success: true, data: await this.service.listExercises(query, false), message: "OK" };
  }

  @Get(":id")
  async detail(@Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string }) {
    return { success: true, data: await this.service.getActiveExercise(id), message: "OK" };
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles("admin", "trainer")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(exercisePayloadSchema)) body: ExercisePayload,
  ) {
    const source = req.auth.role === "trainer" ? "trainer_submission" : "admin";
    return {
      success: true,
      data: await this.service.createExercise(req.auth, body, source),
      message: "Exercise created",
    };
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  @Roles("admin")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
    @Body(new ZodValidationPipe(exerciseUpdateSchema)) body: ExerciseUpdate,
  ) {
    return { success: true, data: await this.service.updateExercise(req.auth, id, body), message: "Exercise updated" };
  }
}

@Controller("admin/exercises")
@UseGuards(AuthGuard)
@Roles("admin")
export class AdminExercisesController {
  constructor(private readonly service: ExercisesService) {}

  @Get()
  async list(@Query(new ZodValidationPipe(exerciseQuerySchema)) query: ExerciseQuery) {
    return { success: true, data: await this.service.listExercises(query, true), message: "OK" };
  }

  @Patch(":id/review")
  async review(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
    @Body(new ZodValidationPipe(reviewDecisionSchema)) body: ReviewDecision,
  ) {
    return {
      success: true,
      data: await this.service.reviewExercise(req.auth, id, body, {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      }),
      message: "Exercise reviewed",
    };
  }

  @Patch(":id/deactivate")
  async deactivate(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
  ) {
    return {
      success: true,
      data: await this.service.deactivateExercise(req.auth, id),
      message: "Exercise deactivated",
    };
  }
}
