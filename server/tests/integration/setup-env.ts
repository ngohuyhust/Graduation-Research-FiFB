const databaseUrl = process.env.FIFB_INTEGRATION_DATABASE_URL;
const redisUrl = process.env.FIFB_INTEGRATION_REDIS_URL;
if (!databaseUrl || !redisUrl) {
  throw new Error("Set FIFB_INTEGRATION_DATABASE_URL and FIFB_INTEGRATION_REDIS_URL to disposable local services.");
}
const database = new URL(databaseUrl);
const redis = new URL(redisUrl);
const isLocal = (host: string) => ["localhost", "127.0.0.1", "[::1]"].includes(host);
if (!isLocal(database.hostname) || database.pathname !== "/fifb_integration" || !isLocal(redis.hostname)) {
  throw new Error(
    "Integration tests require a local fifb_integration database and local Redis; remote credentials are refused.",
  );
}
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = databaseUrl;
process.env.DB_SSL = "false";
process.env.REDIS_URL = redisUrl;
process.env.REDIS_DISABLED = "false";
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.UPSTASH_REDIS_REST_TOKEN = "";
process.env.JWT_ACCESS_SECRET = "integration_access_secret_at_least_32_chars";
process.env.JWT_REFRESH_SECRET = "integration_refresh_secret_at_least_32_chars";
process.env.SENDGRID_API_KEY = "";
process.env.SENDGRID_FROM_EMAIL = "";
process.env.CORS_ORIGIN = "http://localhost:5173";
