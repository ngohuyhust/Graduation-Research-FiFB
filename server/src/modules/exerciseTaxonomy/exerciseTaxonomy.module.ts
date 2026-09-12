import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { ExerciseTaxonomyController } from "./exerciseTaxonomy.controller";
import { ExerciseTaxonomyService, TAXONOMY_REPOSITORY } from "./exerciseTaxonomy.service";
import * as repository from "./exerciseTaxonomy.repository";

@Module({
  imports: [HttpModule],
  controllers: [ExerciseTaxonomyController],
  providers: [ExerciseTaxonomyService, { provide: TAXONOMY_REPOSITORY, useValue: repository }],
  exports: [ExerciseTaxonomyService],
})
export class ExerciseTaxonomyModule {}
