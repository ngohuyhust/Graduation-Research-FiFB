// Tao va tai su dung Redis client cho cache, rate limit.
import { Redis } from "@upstash/redis";
import { createClient } from "redis";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface RedisSetOptions {
  EX?: number;
  PX?: number;
  NX?: boolean;
  XX?: boolean;
}
export interface RedisClient {
  mode: "upstash" | "tcp";
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: string, options?: RedisSetOptions): Promise<unknown>;
  del(...keys: (string | string[])[]): Promise<unknown>;
  sAdd(key: string, ...members: string[]): Promise<unknown>;
  sMembers(key: string): Promise<string[]>;
  scan(
    cursor: string,
    options?: { MATCH?: string; COUNT?: number },
  ): Promise<[string | number, string[]] | { cursor: string | number; keys: string[] }>;
  sendCommand(args: string[]): Promise<unknown>;
}
let redisClient: RedisClient | null = null;
let tcpClient: ReturnType<typeof createClient> | null = null;

function normalizeSetOptions(options: RedisSetOptions = {}) {
  const normalized: { ex?: number; px?: number; nx?: true; xx?: true } = {};
  if (options.EX) normalized.ex = options.EX;
  if (options.PX) normalized.px = options.PX;
  if (options.NX) normalized.nx = true;
  if (options.XX) normalized.xx = true;
  return normalized;
}

function createUpstashAdapter(client: Redis): RedisClient {
  return {
    mode: "upstash",
    get: <T = unknown>(key: string) => client.get<T>(key),
    set: (key: string, value: string, options?: RedisSetOptions) =>
      client.set(key, value, normalizeSetOptions(options) as Parameters<Redis["set"]>[2]),
    del: (...keys: (string | string[])[]) => client.del(...keys.flat()),
    sAdd: (key: string, ...members: string[]) => client.sadd(key, members[0], ...members.slice(1)),
    sMembers: (key: string) => client.smembers(key),
    scan: (cursor: string, options?: { MATCH?: string; COUNT?: number }) =>
      client.scan(cursor, { match: options?.MATCH, count: options?.COUNT }),
    async sendCommand(args: string[]) {
      const [command, ...params] = args;
      const name = command.toUpperCase();
      if (name === "SCRIPT" && String(params[0]).toUpperCase() === "LOAD") {
        return client.scriptLoad(params[1]);
      }
      if (name === "EVALSHA" || name === "EVAL") {
        const [script, keyCount, ...values] = params;
        const count = Number(keyCount);
        const keys = values.slice(0, count);
        const argv = values.slice(count);
        return name === "EVALSHA" ? client.evalsha(script, keys, argv) : client.eval(script, keys, argv);
      }
      const method = name.toLowerCase();
      if (typeof (client as unknown as Record<string, unknown>)[method] !== "function")
        throw new Error(`Unsupported Upstash command: ${name}`);
      return (client as unknown as Record<string, (...values: string[]) => Promise<unknown>>)[method](...params);
    },
  };
}

function createTcpAdapter(client: ReturnType<typeof createClient>): RedisClient {
  return {
    mode: "tcp",
    get: <T = unknown>(key: string) => client.get(key) as Promise<T | null>,
    set: (key: string, value: string, options?: RedisSetOptions) => client.set(key, value, options as never),
    del: (...keys: (string | string[])[]) => client.del(keys.flat()),
    sAdd: (key: string, ...members: string[]) => client.sAdd(key, members),
    sMembers: (key: string) => client.sMembers(key),
    scan: (cursor: string, options?: { MATCH?: string; COUNT?: number }) => client.scan(Number(cursor), options),
    sendCommand: (args: string[]) => client.sendCommand(args),
  };
}

export async function getRedisClient(): Promise<RedisClient | null> {
  if (env.redisDisabled) return null;
  if (redisClient) return redisClient;

  if (env.upstashRedisUrl && env.upstashRedisToken) {
    redisClient = createUpstashAdapter(new Redis({ url: env.upstashRedisUrl, token: env.upstashRedisToken }));
    return redisClient;
  }

  if (!env.redisUrl) return null;
  tcpClient = createClient({ url: env.redisUrl });
  tcpClient.on("error", (error) => {
    logger.error("Redis error", { error });
  });
  await tcpClient.connect();
  redisClient = createTcpAdapter(tcpClient);
  return redisClient;
}

export async function closeRedis() {
  if (tcpClient?.isOpen) await tcpClient.quit();
  tcpClient = null;
  redisClient = null;
}
