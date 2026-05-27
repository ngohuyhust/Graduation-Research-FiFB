const { createClient } = require("redis");
const { env } = require("../config/env");

let redisClient;

async function getRedisClient() {
  if (env.redisDisabled) return null;
  if (!redisClient) {
    redisClient = createClient({ url: env.redisUrl });
    redisClient.on("error", (error) => {
      console.error("Redis error:", error.message);
    });
    await redisClient.connect();
  }
  return redisClient;
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

module.exports = { getRedisClient, closeRedis };
