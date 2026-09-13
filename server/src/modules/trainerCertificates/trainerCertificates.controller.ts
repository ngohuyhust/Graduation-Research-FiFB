import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Roles } from "../../common/auth.guard";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { TrainerCertificatesService } from "./trainerCertificates.service";
import { certificateSchema } from "./trainerCertificates.validation";
import type { CertificatePayload } from "./trainerCertificates.validation";

@Controller("trainers/me/certificates")
@UseGuards(AuthGuard)
@Roles("trainer")
export class TrainerCertificatesController {
  constructor(private readonly service: TrainerCertificatesService) {}

  @Post()
  async submitMine(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(certificateSchema)) body: CertificatePayload,
  ) {
    return { success: true, data: await this.service.submit(req.auth.userId, body), message: "Certificate submitted" };
  }

  @Get()
  async listMine(@Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.service.listMine(req.auth.userId), message: "OK" };
  }
}
