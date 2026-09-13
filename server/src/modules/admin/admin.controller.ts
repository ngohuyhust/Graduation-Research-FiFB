import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AdminService } from "./admin.service";
import {
  usersQuerySchema,
  statusSchema,
  uuidParam,
  certificateQuerySchema,
  certificateReviewDecisionSchema,
  auditQuerySchema,
  deliveryQuerySchema,
} from "./admin.validation";
import type { CertificateQuery, CertificateDecision, AuditQuery, DeliveryQuery } from "./admin.validation";
import type { UsersQuery, UserStatus } from "../users/users.validation";

@Controller("admin")
@UseGuards(AuthGuard)
@Roles("admin")
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get("users")
  async listUsers(@Query(new ZodValidationPipe(usersQuerySchema)) query: UsersQuery) {
    return { success: true, data: await this.service.listUsers(query), message: "OK" };
  }

  @Patch("users/:id/status")
  async updateUserStatus(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParam)) { id }: { id: string },
    @Body(new ZodValidationPipe(statusSchema)) body: { status: UserStatus },
  ) {
    return {
      success: true,
      data: await this.service.updateUserStatus(req.auth, id, body.status, {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      }),
      message: "User status updated",
    };
  }

  @Get("certificates")
  async listCertificates(@Query(new ZodValidationPipe(certificateQuerySchema)) query: CertificateQuery) {
    return { success: true, data: await this.service.listCertificates(query), message: "OK" };
  }

  @Patch("certificates/:id/review")
  async reviewCertificate(
    @Req() req: AuthenticatedRequest,
    @Param(new ZodValidationPipe(uuidParam)) { id }: { id: string },
    @Body(new ZodValidationPipe(certificateReviewDecisionSchema)) body: CertificateDecision,
  ) {
    return {
      success: true,
      data: await this.service.reviewCertificate(req.auth, id, body, {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      }),
      message: "Certificate reviewed",
    };
  }

  @Get("audit-logs")
  async listAuditLogs(@Query(new ZodValidationPipe(auditQuerySchema)) query: AuditQuery) {
    return { success: true, data: await this.service.listAuditLogs(query), message: "OK" };
  }

  @Get("email-deliveries")
  async listEmailDeliveries(@Query(new ZodValidationPipe(deliveryQuerySchema)) query: DeliveryQuery) {
    return { success: true, data: await this.service.listEmailDeliveries(query), message: "OK" };
  }
}
