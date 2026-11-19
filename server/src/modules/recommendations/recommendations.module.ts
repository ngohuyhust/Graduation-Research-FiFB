import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { DatabaseModule } from "../../db/database.module";
import { TrainingProfilesModule } from "../trainingProfiles/trainingProfiles.module";
import { WorkoutPlansModule } from "../workoutPlans/workoutPlans.module";
import { RecommendationsService } from "./recommendations.service";
import { AdaptiveSessionService } from "./adaptive-session.service";
import { RecommendationsController, AdaptiveSessionController } from "./recommendations.controller";
@Module({
  imports: [HttpModule, DatabaseModule, TrainingProfilesModule, WorkoutPlansModule],
  providers: [RecommendationsService, AdaptiveSessionService],
  controllers: [RecommendationsController, AdaptiveSessionController],
})
export class RecommendationsModule {}
