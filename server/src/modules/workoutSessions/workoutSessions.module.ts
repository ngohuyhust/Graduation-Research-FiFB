import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { DatabaseModule } from "../../db/database.module";
import { WorkoutSessionsController } from "./workoutSessions.controller";
import { WorkoutSessionsService } from "./workoutSessions.service";
import { WorkoutSessionsRepository } from "./workoutSessions.repository";

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [WorkoutSessionsController],
  providers: [WorkoutSessionsService, WorkoutSessionsRepository],
  exports: [WorkoutSessionsService, WorkoutSessionsRepository],
})
export class WorkoutSessionsModule {}
