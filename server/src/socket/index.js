// Khoi tao Socket.IO va gan cac handler realtime.
const { Server } = require("socket.io");
const { env } = require("../config/env");
const { registerChatHandlers } = require("./chatHandler");

let io;

function initializeSocket(httpServer, userRepository, chatService, jwtService) {
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
      socket.user = { id: user.id, role: user.role, status: user.status };
      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    registerChatHandlers(socket, chatService);
  });
  return io;
}

function getIO() {
  return io || null;
}

async function closeSocket() {
  if (io) {
    await io.close();
    io = null;
  }
}

module.exports = { initializeSocket, getIO, closeSocket };
