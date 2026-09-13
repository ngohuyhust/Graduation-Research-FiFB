import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { Module } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { DatabaseModule } from "../../db/database.module";
import { UsersPersistenceModule } from "./users-persistence.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuditModule, NotificationsModule, HttpModule, DatabaseModule, UsersPersistenceModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, UsersPersistenceModule],
})
export class UsersModule {}
