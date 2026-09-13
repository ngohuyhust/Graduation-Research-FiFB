// Khai bao schema validate input cho module emailDeliveries.
import { z } from "zod";

export const deliveryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type DeliveryQuery = z.infer<typeof deliveryQuerySchema>;
