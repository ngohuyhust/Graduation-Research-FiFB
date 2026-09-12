import { Module } from "@nestjs/common";
import { ExercisesModule } from "./modules/exercises/exercises.module";
import { ExerciseTaxonomyModule } from "./modules/exerciseTaxonomy/exerciseTaxonomy.module";

@Module({ imports: [ExercisesModule, ExerciseTaxonomyModule] })
export class AppModule {}
