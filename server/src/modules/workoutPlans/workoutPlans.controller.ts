import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe, uuidParamSchema } from "../../common/zod-validation.pipe";
import { paginationQuery } from "../../utils/validators/commonSchemas";
type Pagination = { page: number; limit: number };
import { workoutPlanSchema, workoutPlanUpdateSchema } from "./workoutPlans.validation";
import type { WorkoutPlanPayload, WorkoutPlanUpdate } from "./workoutPlans.validation";
import { WorkoutPlansService } from "./workoutPlans.service";

@Controller("workout-plans")
@UseGuards(AuthGuard)
@Roles("user", "trainer", "admin")
export class WorkoutPlansController {
  constructor(private readonly service: WorkoutPlansService) {}

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
    @Body(new ZodValidationPipe(workoutPlanSchema)) body: WorkoutPlanPayload
  ) {
    return { success: true, data: await this.service.create(req.auth.userId, body), message: "Workout plan created" };
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
    @Body(new ZodValidationPipe(workoutPlanUpdateSchema)) body: WorkoutPlanUpdate
  ) {
    return { success: true, data: await this.service.update(req.auth.userId, id, body), message: "Workout plan updated" };
  }

  @Delete(":id")
  async archive(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string }
  ) {
    return { success: true, data: await this.service.archive(req.auth.userId, id), message: "Workout plan archived" };
  }
}
