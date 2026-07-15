// Khai bao schema validate input cho module audit.
const { z } = require("zod");

const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorId: z.string().uuid().optional(),
});

module.exports = { auditQuerySchema };
