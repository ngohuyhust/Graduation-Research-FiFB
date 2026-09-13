import { Inject, Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import type { UsersQuery, UserStatus } from "../users/users.validation";
import type { Actor } from "../../common/auth.guard";
import type { CertificateQuery, CertificateDecision, AuditQuery, DeliveryQuery } from "./admin.validation";
import type * as CertificatesService from "../trainerCertificates/trainerCertificates.service";
import type * as AuditService from "../audit/audit.service";
import type * as EmailDeliveriesService from "../emailDeliveries/emailDeliveries.service";

export const ADMIN_CERTIFICATES = Symbol("ADMIN_CERTIFICATES");
export const ADMIN_AUDIT = Symbol("ADMIN_AUDIT");
export const ADMIN_EMAIL_DELIVERIES = Symbol("ADMIN_EMAIL_DELIVERIES");
type RequestMeta = { ipAddress?: string; userAgent?: string };

@Injectable()
export class AdminService {
  constructor(
    private readonly users: UsersService,
    @Inject(ADMIN_CERTIFICATES) private readonly certificates: typeof CertificatesService,
    @Inject(ADMIN_AUDIT) private readonly audit: typeof AuditService,
    @Inject(ADMIN_EMAIL_DELIVERIES) private readonly emailDeliveries: typeof EmailDeliveriesService,
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
