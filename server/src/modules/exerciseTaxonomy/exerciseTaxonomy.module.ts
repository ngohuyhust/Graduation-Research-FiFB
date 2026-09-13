import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { ExerciseTaxonomyController } from "./exerciseTaxonomy.controller";
import { ExerciseTaxonomyService } from "./exerciseTaxonomy.service";
import { ExerciseTaxonomyRepository } from "./exerciseTaxonomy.repository";
import { DatabaseModule } from "../../db/database.module";

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [ExerciseTaxonomyController],
  providers: [ExerciseTaxonomyService, ExerciseTaxonomyRepository],
  exports: [ExerciseTaxonomyService],
})
export class ExerciseTaxonomyModule {}
