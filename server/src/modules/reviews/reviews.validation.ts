// Khai bao schema validate input cho module reviews.
import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(2000).optional(),
});

export type ReviewPayload = z.infer<typeof reviewSchema>;

import { paginationQuery } from "../../utils/validators/commonSchemas";
export { paginationQuery };
export type ReviewQuery = z.infer<typeof paginationQuery>;
