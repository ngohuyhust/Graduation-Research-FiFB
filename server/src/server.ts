import { JwtService } from "./modules/auth/jwt.service";
// Chay HTTP server va khoi dong ket noi thoi gian thuc.
import { createApp } from "./app";
import { ChatService } from "./modules/chat/chat.service";
import { UsersRepository } from "./modules/users/users.repository";
import { env } from "./config/env";
import { closePool } from "./db/pool";
import { closeRedis } from "./redis/client";
import { initializeSocket, closeSocket } from "./socket";
import { logger } from "./utils/logger";

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
