import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import { ResponseCache, ResponseCacheInterceptor } from "../../common/response-cache.interceptor";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { ExerciseTaxonomyService } from "./exerciseTaxonomy.service";
import { taxonomySchema } from "./exerciseTaxonomy.validation";
import type { TaxonomyKind, TaxonomyPayload } from "./exerciseTaxonomy.validation";

@Controller("exercise-taxonomy")
@UseInterceptors(ResponseCacheInterceptor)
export class ExerciseTaxonomyController {
  constructor(private readonly service: ExerciseTaxonomyService) {}

  @Get("bodyParts")
  @ResponseCache(900, "taxonomy")
  listBodyParts() {
    return this.list("bodyParts");
  }

  @Get("equipments")
  @ResponseCache(900, "taxonomy")
  listEquipments() {
    return this.list("equipments");
  }

  @Get("muscles")
  @ResponseCache(900, "taxonomy")
  listMuscles() {
    return this.list("muscles");
  }

  @Post("bodyParts")
  @UseGuards(AuthGuard)
  @Roles("admin")
  createBodyPart(@Body(new ZodValidationPipe(taxonomySchema)) body: TaxonomyPayload) {
    return this.create("bodyParts", body.name);
  }

  @Post("equipments")
  @UseGuards(AuthGuard)
  @Roles("admin")
  createEquipment(@Body(new ZodValidationPipe(taxonomySchema)) body: TaxonomyPayload) {
    return this.create("equipments", body.name);
  }

  @Post("muscles")
  @UseGuards(AuthGuard)
  @Roles("admin")
  createMuscle(@Body(new ZodValidationPipe(taxonomySchema)) body: TaxonomyPayload) {
    return this.create("muscles", body.name);
  }

  private async list(kind: TaxonomyKind) {
    return { success: true, data: await this.service.list(kind), message: "OK" };
  }

  private async create(kind: TaxonomyKind, name: string) {
    return { success: true, data: await this.service.create(kind, name), message: "Taxonomy item saved" };
  }
}
