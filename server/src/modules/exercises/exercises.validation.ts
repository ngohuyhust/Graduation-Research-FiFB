// Khai bao schema validate input cho module exercises.
import { z } from "zod";

export const exercisePayloadSchema = z.object({
  externalId: z.string().trim().max(120).optional(),
  name: z.string().trim().min(1).max(200),
  gifUrl: z.string().url().optional(),
  instructions: z.array(z.string().trim().min(1)).default([]),
  status: z.enum(["pending", "active", "inactive", "rejected"]).optional(),
  rawData: z.record(z.unknown()).optional(),
  bodyPartIds: z.array(z.string().uuid()).default([]),
  equipmentIds: z.array(z.string().uuid()).default([]),
  targetMuscleIds: z.array(z.string().uuid()).default([]),
  secondaryMuscleIds: z.array(z.string().uuid()).default([]),
});

export const exerciseUpdateSchema = exercisePayloadSchema.partial();

export const exerciseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  keyword: z.string().trim().max(120).optional(),
  bodyPart: z.string().trim().max(120).optional(),
  equipment: z.string().trim().max(120).optional(),
  targetMuscle: z.string().trim().max(120).optional(),
  secondaryMuscle: z.string().trim().max(120).optional(),
  status: z.enum(["pending", "active", "inactive", "rejected"]).optional(),
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

export type ExercisePayload = z.infer<typeof exercisePayloadSchema>;
export type ExerciseUpdate = z.infer<typeof exerciseUpdateSchema>;
export type ExerciseQuery = z.infer<typeof exerciseQuerySchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
