import { z } from "zod";

const ids = z
  .array(z.string().uuid())
  .max(100)
  .refine((items) => new Set(items).size === items.length, "Duplicate IDs");
export const trainingProfileSchema = z
  .object({
    goal: z.enum(["general_fitness", "build_muscle", "lose_fat", "strength"]),
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
    daysPerWeek: z.number().int().min(1).max(7),
    sessionMinutes: z.number().int().min(15).max(180),
    location: z.enum(["home", "gym", "both"]),
    equipmentIds: ids,
    priorityMuscleIds: ids,
    dislikedExerciseIds: ids,
    limitations: z.string().trim().max(1000),
  })
  .strict();
export type TrainingProfile = z.infer<typeof trainingProfileSchema>;
