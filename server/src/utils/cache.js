const { getRedisClient } = require("../redis/client");

async function invalidateByPrefix(prefix) {
  const redis = await getRedisClient();
  if (!redis) return;

  let cursor = "0";
  do {
    const result = await redis.scan(cursor, { MATCH: `${prefix}*`, COUNT: 100 });
    const nextCursor = Array.isArray(result) ? result[0] : result.cursor;
    const keys = Array.isArray(result) ? result[1] : result.keys;
    if (keys?.length) await redis.del(...keys);
    cursor = String(nextCursor);
  } while (cursor !== "0");
}

module.exports = { invalidateByPrefix };
