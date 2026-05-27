const { z } = require("zod");

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  avatarUrl: z.string().url().optional(),
  fitnessGoal: z.string().trim().min(1).max(500).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

const usersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(["user", "trainer", "admin"]).optional(),
  status: z.enum(["active", "locked", "disabled", "pending_verification"]).optional(),
  keyword: z.string().trim().max(120).optional(),
});

const statusSchema = z.object({ status: z.enum(["active", "locked", "disabled"]) });

module.exports = { updateProfileSchema, usersQuerySchema, statusSchema };
