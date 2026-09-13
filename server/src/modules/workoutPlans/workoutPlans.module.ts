import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { DatabaseModule } from "../../db/database.module";
import { WorkoutPlansController } from "./workoutPlans.controller";
import { WorkoutPlansService } from "./workoutPlans.service";
import { WorkoutPlansRepository } from "./workoutPlans.repository";

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [WorkoutPlansController],
  providers: [WorkoutPlansService, WorkoutPlansRepository],
  exports: [WorkoutPlansService, WorkoutPlansRepository],
})
export class WorkoutPlansModule {}
