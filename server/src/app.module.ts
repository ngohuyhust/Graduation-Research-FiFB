import { Module } from "@nestjs/common";
import { ExercisesModule } from "./modules/exercises/exercises.module";

@Module({ imports: [ExercisesModule] })
export class AppModule {}
