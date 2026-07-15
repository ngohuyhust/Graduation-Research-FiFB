// Khai bao schema validate input cho module users.
const { z } = require("zod");

const fitnessGoal = z.enum(["lose_weight", "gain_muscle", "increase_strength"]);
const gender = z.enum(["male", "female"]);

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  avatarUrl: z.string().url().optional(),
  fitnessGoal: fitnessGoal.optional(),
  gender: gender.optional(),
  weight: z.number().positive().max(500).optional(),
  height: z.number().positive().max(300).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

const usersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(["user", "trainer", "admin"]).optional(),
  status: z.enum(["active", "locked", "disabled", "pending_verification"]).optional(),
  keyword: z.string().trim().max(120).optional(),
});

const statusSchema = z.object({ status: z.enum(["active", "locked", "disabled", "pending_verification"]) });

module.exports = { updateProfileSchema, usersQuerySchema, statusSchema };
