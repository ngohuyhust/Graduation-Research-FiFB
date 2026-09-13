const { JwtService } = require("./modules/auth/jwt.service");
// Chay HTTP server va khoi dong ket noi thoi gian thuc.
const { createApp } = require("./app");
const { ChatService } = require("./modules/chat/chat.service");
const { UsersRepository } = require("./modules/users/users.repository");
const { env } = require("./config/env");
const { closePool } = require("./db/pool");
const { closeRedis } = require("./redis/client");
const { initializeSocket, closeSocket } = require("./socket");
const { logger } = require("./utils/logger");

async function bootstrap() {
  const app = await createApp();
  const server = app.locals.nest.getHttpServer();
  initializeSocket(
    server,
    app.locals.nest.get(UsersRepository),
    app.locals.nest.get(ChatService),
    app.locals.nest.get(JwtService),
  );
  server.listen(env.port, () => {
    logger.info("FiFB backend listening", { port: env.port });
  });

  let closing = false;
  async function shutdown() {
    if (closing) return;
    closing = true;
    server.close(async () => {
      await closeSocket();
      await app.locals.nest.close();
      await closeRedis();
      await closePool();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  logger.error("Backend startup failed", { error });
  process.exit(1);
});
