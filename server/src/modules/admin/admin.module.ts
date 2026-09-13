import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { UsersModule } from "../users/users.module";
import { AdminController } from "./admin.controller";
import { AdminService, ADMIN_EMAIL_DELIVERIES } from "./admin.service";
import { TrainerCertificatesModule } from "../trainerCertificates/trainerCertificates.module";
import { AuditModule } from "../audit/audit.module";
import * as emailDeliveries from "../emailDeliveries/emailDeliveries.service";

@Module({
  imports: [AuditModule, HttpModule, UsersModule, TrainerCertificatesModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    // These business modules remain shared with their existing Express endpoints.
    { provide: ADMIN_EMAIL_DELIVERIES, useValue: emailDeliveries },
  ],
  exports: [AdminService],
})
export class AdminModule {}
