const { env } = require("../config/env");

const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "password",
  "token",
  "accessToken",
  "accesstoken",
  "refreshToken",
  "refreshtoken",
  "refresh_token",
  "refresh_token_hash",
]);

function redact(value) {
  if (!value || typeof value !== "object") return value;
  if (value instanceof Error) return serializeError(value);
  if (Array.isArray(value)) return value.map(redact);

  return Object.entries(value).reduce((next, [key, entry]) => {
    next[key] = SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redact(entry);
    return next;
  }, {});
}

function serializeError(error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
  };
}

function write(level, message, metadata = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(metadata),
  };

  if (env.nodeEnv === "production") {
    process[level === "error" ? "stderr" : "stdout"].write(`${JSON.stringify(payload)}\n`);
    return;
  }

  const meta = Object.keys(metadata).length ? ` ${JSON.stringify(redact(metadata))}` : "";
  process[level === "error" ? "stderr" : "stdout"].write(`[${payload.timestamp}] ${level.toUpperCase()} ${message}${meta}\n`);
}

const logger = {
  info: (message, metadata) => write("info", message, metadata),
  warn: (message, metadata) => write("warn", message, metadata),
  error: (message, metadata) => write("error", message, metadata),
  debug: (message, metadata) => {
    if (env.nodeEnv !== "production") write("debug", message, metadata);
  },
};

module.exports = { logger };
