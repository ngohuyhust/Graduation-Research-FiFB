import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { ExercisesController, AdminExercisesController } from "./exercises.controller";
import { ExercisesService, EXERCISES_REPOSITORY } from "./exercises.service";
import * as repository from "./exercises.repository";

@Module({
  imports: [HttpModule],
  controllers: [ExercisesController, AdminExercisesController],
  providers: [ExercisesService, { provide: EXERCISES_REPOSITORY, useValue: repository }],
  exports: [ExercisesService],
})
export class ExercisesModule {}
