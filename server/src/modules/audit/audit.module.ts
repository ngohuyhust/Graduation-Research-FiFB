import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { AuditRepository } from "./audit.repository";
import { AuditService } from "./audit.service";
@Module({ imports: [DatabaseModule], providers: [AuditRepository, AuditService], exports: [AuditRepository, AuditService] })
export class AuditModule {}
