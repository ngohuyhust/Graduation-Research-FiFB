import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { UsersModule } from "../users/users.module";
import { AdminController } from "./admin.controller";
import { AdminService, ADMIN_AUDIT, ADMIN_EMAIL_DELIVERIES } from "./admin.service";
import { TrainerCertificatesModule } from "../trainerCertificates/trainerCertificates.module";
import * as audit from "../audit/audit.service";
import * as emailDeliveries from "../emailDeliveries/emailDeliveries.service";

@Module({
  imports: [HttpModule, UsersModule, TrainerCertificatesModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    // These business modules remain shared with their existing Express endpoints.
    { provide: ADMIN_AUDIT, useValue: audit },
    { provide: ADMIN_EMAIL_DELIVERIES, useValue: emailDeliveries },
  ],
  exports: [AdminService],
})
export class AdminModule {}
