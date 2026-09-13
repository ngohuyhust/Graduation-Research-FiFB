import type { z } from "zod";
export { usersQuerySchema, statusSchema } from "../users/users.validation";
export { uuidParamSchema as uuidParam } from "../../common/zod-validation.pipe";
export {
  certificateQuerySchema,
  reviewDecisionSchema as certificateReviewDecisionSchema,
} from "../trainerCertificates/trainerCertificates.validation";
export { auditQuerySchema } from "../audit/audit.validation";
export { deliveryQuerySchema } from "../emailDeliveries/emailDeliveries.validation";
import { certificateQuerySchema, reviewDecisionSchema } from "../trainerCertificates/trainerCertificates.validation";
import { auditQuerySchema } from "../audit/audit.validation";
import { deliveryQuerySchema } from "../emailDeliveries/emailDeliveries.validation";

export type CertificateQuery = z.infer<typeof certificateQuerySchema>;
export type CertificateDecision = z.infer<typeof reviewDecisionSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type DeliveryQuery = z.infer<typeof deliveryQuerySchema>;
