const dotenv = require("dotenv");

dotenv.config();

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toInt(process.env.PORT, 4000),
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:4000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: toBool(process.env.DB_SSL, false),
  redisUrl: process.env.REDIS_URL,
  redisDisabled: toBool(process.env.REDIS_DISABLED, false),
  upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  socketIoEnabled: toBool(process.env.SOCKETIO_ENABLED, true),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev_access_secret_change_me_32_chars",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me_32_chars",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  refreshTokenTtlDays: toInt(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  passwordResetTtlMinutes: toInt(process.env.PASSWORD_RESET_TTL_MINUTES, 30),
  emailVerificationTtlHours: toInt(process.env.EMAIL_VERIFICATION_TTL_HOURS, 24),
  bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 12),
  authDebugLogin: toBool(process.env.AUTH_DEBUG_LOGIN, process.env.NODE_ENV !== "production"),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL,
    fromName: process.env.SENDGRID_FROM_NAME || "FiFB",
  },
  exercisedb: {
    apiUrl: process.env.EXERCISEDB_API_URL,
    apiKey: process.env.EXERCISEDB_API_KEY,
    delayMs: toInt(process.env.EXERCISEDB_IMPORT_DELAY_MS, 350),
  },
};

module.exports = { env };
