import { Module } from "@nestjs/common";
import { ExercisesModule } from "./modules/exercises/exercises.module";
import { ExerciseTaxonomyModule } from "./modules/exerciseTaxonomy/exerciseTaxonomy.module";
import { AuthModule } from "./modules/auth/auth.module";

@Module({ imports: [ExercisesModule, ExerciseTaxonomyModule, AuthModule] })
export class AppModule {}
