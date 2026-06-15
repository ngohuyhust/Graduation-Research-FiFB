const { z } = require("zod");

const createSessionSchema = z.object({
  workoutPlanId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional(),
});

const updateSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const exerciseLogSchema = z
  .object({
    exerciseId: z.string().uuid(),
    setNumber: z.number().int().positive().default(1),
    actualReps: z.number().int().positive().optional(),
    actualWeightKg: z.number().min(0).max(100000).optional(),
    durationSeconds: z.number().int().positive().optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .refine(
    (value) => value.actualReps || value.actualWeightKg !== undefined || value.durationSeconds,
    "A log must include reps, weight, or duration",
  );

module.exports = { createSessionSchema, updateSessionSchema, exerciseLogSchema };
