// Khai bao schema validate input cho module workoutPlans.
const { z } = require("zod");

const workoutItemSchema = z.object({
  exerciseId: z.string().uuid(),
  dayNumber: z.number().int().positive().default(1),
  sortOrder: z.number().int().positive().default(1),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  restSeconds: z.number().int().min(0).optional(),
  note: z.string().trim().min(1).max(1000).optional(),
});

const workoutPlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000).optional(),
  visibility: z.enum(["private", "trainer_visible", "public"]).default("private"),
  items: z.array(workoutItemSchema).default([]),
});

const workoutPlanUpdateSchema = workoutPlanSchema.partial().extend({
  status: z.enum(["active", "archived"]).optional(),
  items: z.array(workoutItemSchema).optional(),
});

module.exports = { workoutPlanSchema, workoutPlanUpdateSchema };
