// Khai bao schema validate input cho module workoutPlans.
import { z } from "zod";

export const workoutItemSchema = z.object({
  exerciseId: z.string().uuid(),
  dayNumber: z.number().int().positive().default(1),
  sortOrder: z.number().int().positive().default(1),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  restSeconds: z.number().int().min(0).optional(),
  note: z.string().trim().min(1).max(1000).optional(),
});

export const scheduleSchema = z
  .array(
    z.object({
      weekday: z.number().int().min(1).max(7),
      dayNumber: z.number().int().positive(),
    }),
  )
  .max(7)
  .refine(
    (entries) => new Set(entries.map((entry) => entry.weekday)).size === entries.length,
    "Each weekday can have only one workout day per plan",
  );

export const todayQuerySchema = z.object({ weekday: z.coerce.number().int().min(1).max(7) });

export const workoutPlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  visibility: z.enum(["private", "trainer_visible", "public"]).default("private"),
  items: z.array(workoutItemSchema).default([]),
  schedule: scheduleSchema.default([]),
});

export const workoutPlanUpdateSchema = workoutPlanSchema.partial().extend({
  status: z.enum(["active", "archived"]).optional(),
  items: z.array(workoutItemSchema).optional(),
});

export type WorkoutItem = z.infer<typeof workoutItemSchema>;
export type WorkoutPlanPayload = z.infer<typeof workoutPlanSchema>;
export type WorkoutPlanUpdate = z.infer<typeof workoutPlanUpdateSchema>;
