const { z } = require("zod");

const connectionRequestSchema = z.object({
  trainerId: z.string().uuid(),
  goalSnapshot: z.string().trim().min(1).max(1000).optional(),
  message: z.string().trim().min(1).max(1000).optional(),
});

const rejectConnectionSchema = z.object({ rejectReason: z.string().trim().min(1).max(1000) });

module.exports = { connectionRequestSchema, rejectConnectionSchema };
