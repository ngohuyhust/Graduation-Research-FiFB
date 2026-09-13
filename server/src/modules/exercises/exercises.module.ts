import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { ExercisesController, AdminExercisesController } from "./exercises.controller";
import { ExercisesService } from "./exercises.service";
import { ExercisesRepository } from "./exercises.repository";
import { DatabaseModule } from "../../db/database.module";

@Module({
  imports: [DatabaseModule, AuditModule, NotificationsModule, HttpModule],
  controllers: [ExercisesController, AdminExercisesController],
  providers: [ExercisesService, ExercisesRepository],
  exports: [ExercisesService, ExercisesRepository],
})
export class ExercisesModule {}
