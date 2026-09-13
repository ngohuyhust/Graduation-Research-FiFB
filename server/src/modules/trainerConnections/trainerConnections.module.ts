import { NotificationsModule } from "../notifications/notifications.module";
import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { DatabaseModule } from "../../db/database.module";
import { TrainerConnectionsController } from "./trainerConnections.controller";
import { TrainerConnectionsService } from "./trainerConnections.service";
import { TrainerConnectionsRepository } from "./trainerConnections.repository";

@Module({
  imports: [NotificationsModule, HttpModule, DatabaseModule],
  controllers: [TrainerConnectionsController],
  providers: [TrainerConnectionsService, TrainerConnectionsRepository],
  exports: [TrainerConnectionsService, TrainerConnectionsRepository],
})
export class TrainerConnectionsModule {}
