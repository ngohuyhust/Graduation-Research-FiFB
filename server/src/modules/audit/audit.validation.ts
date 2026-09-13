// Khai bao schema validate input cho module audit.
import { z } from "zod";

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorId: z.string().uuid().optional(),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;
