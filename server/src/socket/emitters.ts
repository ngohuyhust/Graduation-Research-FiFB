// Phat su kien realtime tu server den client.
import { getIO } from "./index";

export function emitToUser(userId: string, event: string, data: unknown) {
  const io = getIO();
  if (io) io.to(`user:${userId}`).emit(event, data);
}
