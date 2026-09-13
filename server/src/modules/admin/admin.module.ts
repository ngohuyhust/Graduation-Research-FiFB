import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { UsersModule } from "../users/users.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { TrainerCertificatesModule } from "../trainerCertificates/trainerCertificates.module";
import { AuditModule } from "../audit/audit.module";
import { EmailDeliveriesModule } from "../emailDeliveries/emailDeliveries.module";

@Module({
  imports: [EmailDeliveriesModule, AuditModule, HttpModule, UsersModule, TrainerCertificatesModule],
  controllers: [AdminController],
  providers: [
    AdminService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
