const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const DEV_ACCESS_SECRET = "dev_access_secret_change_me_32_chars";
const DEV_REFRESH_SECRET = "dev_refresh_secret_change_me_32_chars";

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const boolSchema = (fallback = false) => z.preprocess((value) => toBool(value, fallback), z.boolean());
const optionalTrimmed = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: optionalTrimmed.default("http://localhost:4000"),
  FRONTEND_URL: optionalTrimmed.default("http://localhost:5173"),
  DATABASE_URL: optionalTrimmed,
  DB_SSL: boolSchema(false),
  REDIS_URL: optionalTrimmed,
  REDIS_DISABLED: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return process.env.REDIS_URL ? false : true;
    return toBool(value, false);
  }, z.boolean()),
  UPSTASH_REDIS_REST_URL: optionalTrimmed,
  UPSTASH_REDIS_REST_TOKEN: optionalTrimmed,
  SOCKETIO_ENABLED: boolSchema(true),
  JWT_ACCESS_SECRET: optionalTrimmed,
  JWT_REFRESH_SECRET: optionalTrimmed,
  JWT_ACCESS_EXPIRES_IN: optionalTrimmed.default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  REFRESH_COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  AUTH_DEBUG_LOGIN: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return process.env.NODE_ENV !== "production";
    return toBool(value, false);
  }, z.boolean()),
  CORS_ORIGIN: optionalTrimmed.default("http://localhost:5173,http://localhost:3000"),
  SENDGRID_API_KEY: optionalTrimmed,
  SENDGRID_FROM_EMAIL: optionalTrimmed,
  SENDGRID_FROM_NAME: optionalTrimmed.default("FiFB"),
  EXERCISEDB_API_URL: optionalTrimmed,
  EXERCISEDB_API_KEY: optionalTrimmed,
  EXERCISEDB_IMPORT_DELAY_MS: z.coerce.number().int().positive().default(350),
});

function formatIssues(issues) {
  return issues.map((issue) => {
    const path = issue.path.join(".") || "ENV";
    return `- ${path} ${issue.message}`;
  });
}

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  const issues = parsed.success ? [] : formatIssues(parsed.error.issues);
  const data = parsed.success ? parsed.data : {};
  const nodeEnv = data.NODE_ENV || process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const accessSecret = data.JWT_ACCESS_SECRET || (!isProduction ? DEV_ACCESS_SECRET : undefined);
  const refreshSecret = data.JWT_REFRESH_SECRET || (!isProduction ? DEV_REFRESH_SECRET : undefined);
  const corsOrigins = String(data.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (isProduction) {
    for (const key of ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "JWT_ACCESS_EXPIRES_IN", "CORS_ORIGIN"]) {
      if (!data[key]) issues.push(`- ${key} is required in production`);
    }
    if (data.REDIS_DISABLED) issues.push("- REDIS_DISABLED cannot be true in production");
    if (!data.REDIS_URL && !(data.UPSTASH_REDIS_REST_URL && data.UPSTASH_REDIS_REST_TOKEN)) {
      issues.push("- REDIS_URL or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN is required in production");
    }
    if (data.REFRESH_COOKIE_SAME_SITE === "none") {
      issues.push("- REFRESH_COOKIE_SAME_SITE=none requires CSRF protection and is not allowed by this build");
    }
  }

  if (accessSecret && accessSecret.length < 32) issues.push("- JWT_ACCESS_SECRET must be at least 32 characters");
  if (refreshSecret && refreshSecret.length < 32) issues.push("- JWT_REFRESH_SECRET must be at least 32 characters");
  if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
    issues.push("- JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET");
  }
  if (corsOrigins.includes("*")) issues.push("- CORS_ORIGIN cannot be * when credentials are enabled");

  if (issues.length) {
    throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
  }

  return { ...data, JWT_ACCESS_SECRET: accessSecret, JWT_REFRESH_SECRET: refreshSecret, corsOrigins };
}

const validated = validateEnv();

const env = {
  nodeEnv: validated.NODE_ENV,
  port: validated.PORT,
  apiBaseUrl: validated.API_BASE_URL,
  frontendUrl: validated.FRONTEND_URL,
  databaseUrl: validated.DATABASE_URL,
  dbSsl: validated.DB_SSL,
  redisUrl: validated.REDIS_URL,
  redisDisabled: validated.REDIS_DISABLED,
  upstashRedisUrl: validated.UPSTASH_REDIS_REST_URL,
  upstashRedisToken: validated.UPSTASH_REDIS_REST_TOKEN,
  socketIoEnabled: validated.SOCKETIO_ENABLED,
  jwtAccessSecret: validated.JWT_ACCESS_SECRET,
  jwtRefreshSecret: validated.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: validated.JWT_ACCESS_EXPIRES_IN,
  refreshTokenTtlDays: validated.REFRESH_TOKEN_TTL_DAYS,
  refreshCookieSameSite: validated.REFRESH_COOKIE_SAME_SITE,
  passwordResetTtlMinutes: validated.PASSWORD_RESET_TTL_MINUTES,
  emailVerificationTtlHours: validated.EMAIL_VERIFICATION_TTL_HOURS,
  bcryptRounds: validated.BCRYPT_ROUNDS,
  authDebugLogin: validated.AUTH_DEBUG_LOGIN,
  corsOrigin: validated.CORS_ORIGIN,
  corsOrigins: validated.corsOrigins,
  sendgrid: {
    apiKey: validated.SENDGRID_API_KEY,
    fromEmail: validated.SENDGRID_FROM_EMAIL,
    fromName: validated.SENDGRID_FROM_NAME,
  },
  exercisedb: {
    apiUrl: validated.EXERCISEDB_API_URL,
    apiKey: validated.EXERCISEDB_API_KEY,
    delayMs: validated.EXERCISEDB_IMPORT_DELAY_MS,
  },
};

module.exports = { env };
