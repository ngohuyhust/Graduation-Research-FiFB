import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, Roles, type AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { RecommendationsService } from "./recommendations.service";
import { AdaptiveSessionService, changeSchema, feedbackSchema } from "./adaptive-session.service";
const runSchema = z.object({ runId: z.string().uuid() }).strict();
const ok = (data: unknown) => ({ success: true, data, message: "OK" });

@Controller({ path: "recommendations", version: "1" })
@UseGuards(AuthGuard)
@Roles("user")
export class RecommendationsController {
  constructor(private service: RecommendationsService) {}
  @Post() async preview(@Req() req: AuthenticatedRequest) {
    return ok(await this.service.preview(req.auth.userId));
  }
  @Post(":id/accept") async accept(@Req() req: AuthenticatedRequest, @Param("id", ParseUUIDPipe) id: string) {
    return ok(await this.service.accept(req.auth.userId, id));
  }
  @Post(":id/dismiss") async dismiss(@Req() req: AuthenticatedRequest, @Param("id", ParseUUIDPipe) id: string) {
    return ok(await this.service.dismiss(req.auth.userId, id));
  }
}

@Controller({ path: "workout-sessions/:id", version: "1" })
@UseGuards(AuthGuard)
@Roles("user")
export class AdaptiveSessionController {
  constructor(private service: AdaptiveSessionService) {}
  @Post("substitutions") async preview(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(changeSchema)) body: z.infer<typeof changeSchema>,
  ) {
    return ok(await this.service.substitution(req.auth.userId, id, body));
  }
  @Post("substitutions/accept") async change(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(runSchema)) body: z.infer<typeof runSchema>,
  ) {
    return ok(await this.service.accept(req.auth.userId, id, body.runId));
  }
  @Put("exercises/:exerciseId/feedback") async feedback(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("exerciseId", ParseUUIDPipe) ex: string,
    @Body(new ZodValidationPipe(feedbackSchema)) body: z.infer<typeof feedbackSchema>,
  ) {
    return ok(await this.service.feedback(req.auth.userId, id, ex, body));
  }
  @Header("Cache-Control", "private, no-store")
  @Get("exercises/:exerciseId/suggestion")
  async suggest(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("exerciseId", ParseUUIDPipe) ex: string,
  ) {
    return ok(await this.service.suggestion(req.auth.userId, id, ex));
  }
  @Post("exercises/:exerciseId/suggestion/accept") async apply(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("exerciseId", ParseUUIDPipe) ex: string,
    @Body(new ZodValidationPipe(runSchema)) body: z.infer<typeof runSchema>,
  ) {
    return ok(await this.service.accept(req.auth.userId, id, body.runId, ex));
  }
}
