const { Server } = require("socket.io");
const { env } = require("../config/env");
const { verifyAccessToken } = require("../modules/auth/jwt.service");
const { registerChatHandlers } = require("./chatHandler");

let io;

function initializeSocket(httpServer) {
  if (!env.socketIoEnabled) return null;
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const payload = verifyAccessToken(token);
      socket.user = { id: payload.sub, role: payload.role, status: payload.status };
      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    registerChatHandlers(socket);
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
