// Khoi tao Socket.IO va gan cac handler realtime.
import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import type { UsersRepository } from "../modules/users/users.repository";
import type { ChatService } from "../modules/chat/chat.service";
import type { JwtService } from "../modules/auth/jwt.service";
import { env } from "../config/env";
import { registerChatHandlers } from "./chatHandler";

export type AuthenticatedSocket = Socket & { user: { id: string; role: string; status: string } };
let io: Server | null = null;

export function initializeSocket(
  httpServer: HttpServer,
  userRepository: UsersRepository,
  chatService: ChatService,
  jwtService: JwtService,
) {
  if (!env.socketIoEnabled) return null;
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const payload = jwtService.verifyAccessToken(token);
      const user = await userRepository.findById(payload.sub);
      if (!user) return next(new Error("Invalid token subject"));
      if (user.status !== "active") return next(new Error("Account is not active"));
      if (!user.email_verified_at) return next(new Error("Email verification required"));
      (socket as AuthenticatedSocket).user = { id: user.id, role: user.role, status: user.status };
      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${(socket as AuthenticatedSocket).user.id}`);
    registerChatHandlers(socket as AuthenticatedSocket, chatService);
  });
  return io;
}

export function getIO() {
  return io || null;
}

export async function closeSocket() {
  if (io) {
    await io.close();
    io = null;
  }
}
