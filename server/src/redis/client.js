const { Redis } = require("@upstash/redis");
const { createClient } = require("redis");
const { env } = require("../config/env");

let redisClient;
let tcpClient;

function normalizeSetOptions(options = {}) {
  const normalized = {};
  if (options.EX) normalized.ex = options.EX;
  if (options.PX) normalized.px = options.PX;
  if (options.NX) normalized.nx = true;
  if (options.XX) normalized.xx = true;
  return normalized;
}

function createUpstashAdapter(client) {
  return {
    mode: "upstash",
    get: (key) => client.get(key),
    set: (key, value, options) => client.set(key, value, normalizeSetOptions(options)),
    del: (...keys) => client.del(...keys),
    sAdd: (key, ...members) => client.sadd(key, ...members),
    sMembers: (key) => client.smembers(key),
    scan: (cursor, options) => client.scan(cursor, { match: options?.MATCH, count: options?.COUNT }),
    async sendCommand(args) {
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
      if (typeof client[method] !== "function") throw new Error(`Unsupported Upstash command: ${name}`);
      return client[method](...params);
    },
  };
}

function createTcpAdapter(client) {
  return {
    mode: "tcp",
    get: (key) => client.get(key),
    set: (key, value, options) => client.set(key, value, options),
    del: (...keys) => client.del(keys),
    sAdd: (key, ...members) => client.sAdd(key, members),
    sMembers: (key) => client.sMembers(key),
    scan: (cursor, options) => client.scan(cursor, options),
    sendCommand: (args) => client.sendCommand(args),
  };
}

async function getRedisClient() {
  if (env.redisDisabled) return null;
  if (redisClient) return redisClient;

  if (env.upstashRedisUrl && env.upstashRedisToken) {
    redisClient = createUpstashAdapter(new Redis({ url: env.upstashRedisUrl, token: env.upstashRedisToken }));
    return redisClient;
  }

  if (!env.redisUrl) return null;
  tcpClient = createClient({ url: env.redisUrl });
  tcpClient.on("error", (error) => {
    console.error("Redis error:", error.message);
  });
  await tcpClient.connect();
  redisClient = createTcpAdapter(tcpClient);
  return redisClient;
}

async function closeRedis() {
  if (tcpClient?.isOpen) await tcpClient.quit();
  tcpClient = null;
  redisClient = null;
}

module.exports = { getRedisClient, closeRedis };
