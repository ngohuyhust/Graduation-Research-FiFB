// Khai bao schema validate input cho module trainerConnections.
import { z } from "zod";

export const connectionRequestSchema = z.object({
  trainerId: z.string().uuid(),
  goalSnapshot: z.string().trim().min(1).max(1000).optional(),
  message: z.string().trim().min(1).max(1000).optional(),
});

export const rejectConnectionSchema = z.object({ rejectReason: z.string().trim().min(1).max(1000) });

export type ConnectionRequestPayload = z.infer<typeof connectionRequestSchema>;
export type RejectConnectionPayload = z.infer<typeof rejectConnectionSchema>;
