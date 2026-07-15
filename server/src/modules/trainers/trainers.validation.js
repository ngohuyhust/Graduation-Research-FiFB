// Khai bao schema validate input cho module trainers.
const { z } = require("zod");

const trainerProfileSchema = z.object({
  bio: z.string().trim().min(1).max(2000).optional(),
  specialization: z.string().trim().min(1).max(200).optional(),
  yearsOfExperience: z.number().int().min(0).max(80).optional(),
});

const trainerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  specialization: z.string().trim().max(120).optional(),
  verified: z.coerce.boolean().optional(),
});

module.exports = { trainerProfileSchema, trainerQuerySchema };
