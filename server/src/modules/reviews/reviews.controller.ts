import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe, uuidParamSchema } from "../../common/zod-validation.pipe";
import { ReviewsService } from "./reviews.service";
import { reviewSchema, paginationQuery } from "./reviews.validation";
import type { ReviewPayload, ReviewQuery } from "./reviews.validation";

@Controller("trainers/:id/reviews")
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
    @Body(new ZodValidationPipe(reviewSchema)) body: ReviewPayload,
  ) {
    return { success: true, data: await this.service.upsertReview(req.auth.userId, id, body), message: "Review saved" };
  }

  @Get()
  async list(
    @Param(new ZodValidationPipe(uuidParamSchema)) { id }: { id: string },
    @Query(new ZodValidationPipe(paginationQuery)) query: ReviewQuery,
  ) {
    return { success: true, data: await this.service.listTrainerReviews(id, query), message: "OK" };
  }
}
