// Cau hinh logger dung chung cho server.
import { env } from "../config/env";

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

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (value instanceof Error) return serializeError(value);
  if (Array.isArray(value)) return value.map(redact);

  return Object.entries(value).reduce<Record<string, unknown>>((next, [key, entry]) => {
    next[key] = SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redact(entry);
    return next;
  }, {});
}

function serializeError(error: Error & { code?: string; statusCode?: number }) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
  };
}

function write(level: "info" | "warn" | "error" | "debug", message: string, metadata: Record<string, unknown> = {}) {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(redact(metadata) as Record<string, unknown>),
  };

  if (env.nodeEnv === "production") {
    process[level === "error" ? "stderr" : "stdout"].write(`${JSON.stringify(payload)}\n`);
    return;
  }

  const meta = Object.keys(metadata).length ? ` ${JSON.stringify(redact(metadata))}` : "";
  process[level === "error" ? "stderr" : "stdout"].write(
    `[${payload.timestamp}] ${level.toUpperCase()} ${message}${meta}\n`,
  );
}

export const logger = {
  info: (message: string, metadata?: Record<string, unknown>) => write("info", message, metadata),
  warn: (message: string, metadata?: Record<string, unknown>) => write("warn", message, metadata),
  error: (message: string, metadata?: Record<string, unknown>) => write("error", message, metadata),
  debug: (message: string, metadata?: Record<string, unknown>) => {
    if (env.nodeEnv !== "production") write("debug", message, metadata);
  },
};
