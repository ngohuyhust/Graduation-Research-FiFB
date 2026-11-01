// Khai bao schema validate input cho module workoutSessions.
import { z } from "zod";

export const createSessionSchema = z
  .object({
    workoutPlanId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(2000).optional(),
    clientOperationId: z.string().uuid().optional(),
    dayNumber: z.number().int().positive().max(2147483647).optional(),
  })
  .refine(
    (value) => value.dayNumber === undefined || value.workoutPlanId !== undefined,
    "A workout day requires a plan",
  );

export const updateSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    completed: z.boolean().optional(),
    paused: z.boolean().optional(),
    restEndsAt: z.string().datetime().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const exerciseLogSchema = z
  .object({
    exerciseId: z.string().uuid(),
    setNumber: z.number().int().positive().default(1),
    actualReps: z.number().int().positive().optional(),
    actualWeightKg: z.number().min(0).max(100000).optional(),
    durationSeconds: z.number().int().positive().optional(),
    note: z.string().trim().max(1000).optional(),
    clientOperationId: z.string().uuid().optional(),
    restEndsAt: z.string().datetime().nullable().optional(),
  })
  .refine(
    (value) => value.actualReps || value.actualWeightKg !== undefined || value.durationSeconds,
    "A log must include reps, weight, or duration",
  );

export type CreateSession = z.infer<typeof createSessionSchema>;
export type UpdateSession = z.infer<typeof updateSessionSchema>;
export type ExerciseLog = z.infer<typeof exerciseLogSchema>;

export const exerciseParam = z.object({ exerciseId: z.string().uuid() });
export type ExerciseParam = z.infer<typeof exerciseParam>;

export const logParam = z.object({ id: z.string().uuid(), logId: z.string().uuid() });
