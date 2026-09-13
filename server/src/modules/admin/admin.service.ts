import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import type { UsersQuery, UserStatus } from "../users/users.validation";
import type { Actor } from "../../common/auth.guard";
import type { CertificateQuery, CertificateDecision, AuditQuery, DeliveryQuery } from "./admin.validation";
import { TrainerCertificatesService } from "../trainerCertificates/trainerCertificates.service";
import { AuditService } from "../audit/audit.service";
import { EmailDeliveriesService } from "../emailDeliveries/emailDeliveries.service";

type RequestMeta = { ipAddress?: string; userAgent?: string };

@Injectable()
export class AdminService {
  constructor(
    private readonly users: UsersService,
    private readonly certificates: TrainerCertificatesService,
    private readonly audit: AuditService,
    private readonly emailDeliveries: EmailDeliveriesService,
  ) {}

  listUsers(query: UsersQuery) {
    return this.users.listUsers(query);
  }

  updateUserStatus(actor: Actor, id: string, status: UserStatus, meta: RequestMeta) {
    return this.users.updateUserStatus(actor, id, status, meta);
  }

  listCertificates(query: CertificateQuery) {
    return this.certificates.listAll(query);
  }

  reviewCertificate(actor: Actor, id: string, decision: CertificateDecision, meta: RequestMeta) {
    return this.certificates.review(actor, id, decision, meta);
  }

  listAuditLogs(query: AuditQuery) {
    return this.audit.listAuditLogs(query);
  }

  listEmailDeliveries(query: DeliveryQuery) {
    return this.emailDeliveries.list(query);
  }
}
