// Khai bao schema validate input cho module trainerCertificates.
import { z } from "zod";

export const certificateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  issuer: z.string().trim().min(1).max(200).optional(),
  certificateUrl: z.string().url().optional(),
  certificateNumber: z.string().trim().min(1).max(120).optional(),
  verificationUrl: z.string().url().optional(),
  issuedAt: z.string().date().optional(),
  expiresAt: z.string().date().optional(),
});

export const reviewDecisionSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().trim().min(1).max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "rejected" && !value.rejectionReason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rejectionReason"], message: "Rejection reason is required" });
    }
  });

export const certificateQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export type CertificatePayload = z.infer<typeof certificateSchema>;
export type CertificateDecision = z.infer<typeof reviewDecisionSchema>;
export type CertificateQuery = z.infer<typeof certificateQuerySchema>;
