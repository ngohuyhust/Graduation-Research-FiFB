// Chua cac schema validate dung lai nhieu noi.
import { z } from "zod";

export const uuidParam = z.object({ id: z.string().uuid() });
export const trainerIdParam = z.object({ trainerId: z.string().uuid() });

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
