// Chay HTTP server va khoi dong ket noi thoi gian thuc.
const http = require("http");
const { createApp } = require("./app");
const { env } = require("./config/env");
const { closePool } = require("./db/pool");
const { closeRedis } = require("./redis/client");
const { initializeSocket, closeSocket } = require("./socket");
const { logger } = require("./utils/logger");

const app = createApp();
const server = http.createServer(app);
initializeSocket(server);
server.listen(env.port, () => {
  logger.info("FiFB backend listening", { port: env.port });
});

async function shutdown() {
  server.close(async () => {
    await closeSocket();
    await closeRedis();
    await closePool();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
