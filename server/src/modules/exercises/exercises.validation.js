const { z } = require("zod");

const exercisePayloadSchema = z.object({
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

const exerciseUpdateSchema = exercisePayloadSchema.partial();

const exerciseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  keyword: z.string().trim().max(120).optional(),
  bodyPart: z.string().trim().max(120).optional(),
  equipment: z.string().trim().max(120).optional(),
  targetMuscle: z.string().trim().max(120).optional(),
  secondaryMuscle: z.string().trim().max(120).optional(),
  status: z.enum(["pending", "active", "inactive", "rejected"]).optional(),
});

const reviewDecisionSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().trim().min(1).max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "rejected" && !value.rejectionReason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rejectionReason"], message: "Rejection reason is required" });
    }
  });

module.exports = { exercisePayloadSchema, exerciseUpdateSchema, exerciseQuerySchema, reviewDecisionSchema };
