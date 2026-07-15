// Cache response JSON vao Redis de tang toc cac API doc.
const { getRedisClient } = require("../redis/client");

function cacheResponse(ttlSeconds = 300, keyPrefix = "cache") {
  return async (req, res, next) => {
    try {
      const redis = await getRedisClient();
      if (!redis) return next();
      const key = `${keyPrefix}:${req.originalUrl}`;
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(typeof cached === "string" ? JSON.parse(cached) : cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.set(key, JSON.stringify(body), { EX: ttlSeconds }).catch(() => {});
          res.setHeader("X-Cache", "MISS");
        }
        return originalJson(body);
      };
      return next();
    } catch {
      return next();
    }
  };
}

module.exports = { cacheResponse };
