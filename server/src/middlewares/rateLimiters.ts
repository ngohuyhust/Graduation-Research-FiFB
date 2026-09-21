// Gioi han tan suat request cho API va auth endpoints.
import rateLimit, { type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
const { getRedisClient } = require("../redis/client");
const { env } = require("../config/env");

function createRedisStore(prefix: string) {
  const redisConfigured =
    !env.redisDisabled && ((env.upstashRedisUrl && env.upstashRedisToken) || Boolean(env.redisUrl));
  if (!redisConfigured) return undefined;
  return new RedisStore({
    prefix,
    sendCommand: async (...args) => {
      const redis = await getRedisClient();
      if (!redis) throw new Error("Redis is not configured");
      return redis.sendCommand(args) as Promise<string | number | boolean | Array<string | number | boolean>>;
    },
  });
}

function createRateLimiter(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  store: createRedisStore("rate-limit:auth:"),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many auth attempts. Try again later.",
        details: null,
      },
      requestId: req.requestId,
    });
  },
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 200,
  store: createRedisStore("rate-limit:api:"),
  skip: () => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Try again later.",
        details: null,
      },
      requestId: req.requestId,
    });
  },
});
