const { createApp } = require("./app");
const { env } = require("./config/env");
const { closePool } = require("./db/pool");
const { closeRedis } = require("./redis/client");

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`FiFB backend listening on port ${env.port}`);
});

async function shutdown() {
  server.close(async () => {
    await closeRedis();
    await closePool();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
