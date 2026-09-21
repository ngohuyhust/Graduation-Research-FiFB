jest.mock("@upstash/redis", () => ({ Redis: jest.fn() }));
jest.mock("redis", () => ({ createClient: jest.fn() }));
const { Redis } = require("@upstash/redis");
const { createClient } = require("redis");
const { env } = require("../src/config/env");
const { getRedisClient, closeRedis } = require("../src/redis/client");
const { invalidateByPrefix } = require("../src/utils/cache");

describe("Redis adapters and cache invalidation", () => {
  let original;
  beforeEach(async () => {
    await closeRedis();
    original = {
      redisDisabled: env.redisDisabled,
      redisUrl: env.redisUrl,
      upstashRedisUrl: env.upstashRedisUrl,
      upstashRedisToken: env.upstashRedisToken,
    };
    env.redisDisabled = false;
    env.redisUrl = undefined;
    env.upstashRedisUrl = undefined;
    env.upstashRedisToken = undefined;
    jest.clearAllMocks();
  });
  afterEach(async () => {
    await closeRedis();
    Object.assign(env, original);
  });

  test("disabled or unconfigured Redis returns null", async () => {
    expect(await getRedisClient()).toBeNull();
    env.redisDisabled = true;
    env.redisUrl = "redis://localhost:6379";
    expect(await getRedisClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  test("TCP adapter reuses connection, preserves command options and closes it", async () => {
    env.redisUrl = "redis://localhost:6379";
    const tcp = {
      on: jest.fn(),
      connect: jest.fn(),
      quit: jest.fn(),
      isOpen: true,
      get: jest.fn().mockResolvedValue("stored"),
      set: jest.fn(),
      del: jest.fn(),
      sAdd: jest.fn(),
      sMembers: jest.fn().mockResolvedValue(["one"]),
      scan: jest.fn().mockResolvedValue({ cursor: 0, keys: [] }),
      sendCommand: jest.fn().mockResolvedValue("OK"),
    };
    createClient.mockReturnValue(tcp);
    const client = await getRedisClient();
    expect(client).toBe(await getRedisClient());
    expect(tcp.connect).toHaveBeenCalledTimes(1);
    expect(await client.get("key")).toBe("stored");
    await client.set("key", "value", { EX: 60, NX: true });
    expect(tcp.set).toHaveBeenCalledWith("key", "value", { EX: 60, NX: true });
    await client.del("one", "two");
    await client.del(["three", "four"]);
    expect(tcp.del.mock.calls).toEqual([[["one", "two"]], [["three", "four"]]]);
    await client.sAdd("members", "one", "two");
    expect(tcp.sAdd).toHaveBeenCalledWith("members", ["one", "two"]);
    await client.scan("0", { MATCH: "prefix:*", COUNT: 100 });
    expect(tcp.scan).toHaveBeenCalledWith(0, { MATCH: "prefix:*", COUNT: 100 });
    await client.sendCommand(["PING"]);
    expect(tcp.sendCommand).toHaveBeenCalledWith(["PING"]);
    await closeRedis();
    expect(tcp.quit).toHaveBeenCalledTimes(1);
  });

  test("Upstash adapter maps options and cache scan deletion", async () => {
    env.upstashRedisUrl = "https://example.com";
    env.upstashRedisToken = "token";
    const upstash = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
      sadd: jest.fn(),
      smembers: jest.fn().mockResolvedValue([]),
      scan: jest
        .fn()
        .mockResolvedValueOnce([1, ["exercise:one"]])
        .mockResolvedValueOnce([0, ["exercise:two"]]),
      scriptLoad: jest.fn().mockResolvedValue("sha"),
      evalsha: jest.fn().mockResolvedValue(1),
      eval: jest.fn().mockResolvedValue(2),
    };
    Redis.mockImplementation(() => upstash);
    const client = await getRedisClient();
    await client.set("key", "value", { EX: 60, NX: true });
    expect(upstash.set).toHaveBeenCalledWith("key", "value", { ex: 60, nx: true });
    await client.sAdd("members", "one", "two");
    expect(upstash.sadd).toHaveBeenCalledWith("members", "one", "two");
    expect(await client.sendCommand(["SCRIPT", "LOAD", "return 1"])).toBe("sha");
    expect(await client.sendCommand(["EVALSHA", "sha", "1", "key", "value"])).toBe(1);
    expect(upstash.evalsha).toHaveBeenCalledWith("sha", ["key"], ["value"]);
    await invalidateByPrefix("exercise:");
    expect(upstash.scan.mock.calls).toEqual([
      ["0", { match: "exercise:*", count: 100 }],
      ["1", { match: "exercise:*", count: 100 }],
    ]);
    expect(upstash.del.mock.calls).toEqual([["exercise:one"], ["exercise:two"]]);
  });
});

export {};
