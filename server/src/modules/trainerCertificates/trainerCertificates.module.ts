import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { DatabaseModule } from "../../db/database.module";
import { TrainersModule } from "../trainers/trainers.module";
import { TrainerCertificatesController } from "./trainerCertificates.controller";
import { TrainerCertificatesService } from "./trainerCertificates.service";
import { TrainerCertificatesRepository } from "./trainerCertificates.repository";

@Module({
  imports: [AuditModule, NotificationsModule, HttpModule, DatabaseModule, TrainersModule],
  controllers: [TrainerCertificatesController],
  providers: [TrainerCertificatesService, TrainerCertificatesRepository],
  exports: [TrainerCertificatesService, TrainerCertificatesRepository],
})
export class TrainerCertificatesModule {}
