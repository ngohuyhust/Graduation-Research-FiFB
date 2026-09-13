// Khai bao schema validate input cho module chat.
import { z } from "zod";

export const connectionParam = z.object({ connectionId: z.string().uuid() });
export const messageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  messageType: z.enum(["text", "image"]).default("text"),
});
export const messageQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type MessagePayload = z.infer<typeof messageSchema>;
export type MessageQuery = z.infer<typeof messageQuery>;
export type ConnectionParam = z.infer<typeof connectionParam>;
