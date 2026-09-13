// Xu ly su kien chat realtime qua Socket.IO.
const validation = require("../modules/chat/chat.validation");

function parse(schema, payload) {
  const result = schema.safeParse(payload);
  if (!result.success) throw new Error("Invalid chat event payload");
  return result.data;
}

function reply(ack, error, data) {
  if (typeof ack !== "function") return;
  if (error) {
    ack({ ok: false, error: error.message || "Chat operation failed" });
  } else {
    ack({ ok: true, data });
  }
}

function createSocketRateLimiter(limits) {
  const buckets = new Map();

  return function check(eventName) {
    const limit = limits[eventName];
    if (!limit) return;

    const now = Date.now();
    const bucket = buckets.get(eventName);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(eventName, { count: 1, resetAt: now + limit.windowMs });
      return;
    }

    bucket.count += 1;
    if (bucket.count > limit.max) throw new Error("Too many chat events. Try again later.");
  };
}

function registerChatHandlers(socket, chatService) {
  const checkRate = createSocketRateLimiter({
    "chat:join": { max: 20, windowMs: 60_000 },
    "chat:send": { max: 30, windowMs: 60_000 },
    "chat:typing": { max: 60, windowMs: 60_000 },
    "chat:read": { max: 60, windowMs: 60_000 },
  });

  socket.on("chat:join", async ({ connectionId } = {}, ack) => {
    try {
      checkRate("chat:join");
      ({ connectionId } = parse(validation.connectionParam, { connectionId }));
      await chatService.membership(connectionId, socket.user.id);
      await socket.join(`chat:${connectionId}`);
      reply(ack, null, { connectionId });
    } catch (error) {
      reply(ack, error);
    }
  });

  socket.on("chat:send", async ({ connectionId, content, messageType = "text" } = {}, ack) => {
    try {
      checkRate("chat:send");
      ({ connectionId } = parse(validation.connectionParam, { connectionId }));
      const payload = parse(validation.messageSchema, { content, messageType });
      const result = await chatService.send(socket.user.id, connectionId, payload);
      reply(ack, null, result);
    } catch (error) {
      reply(ack, error);
    }
  });

  socket.on("chat:typing", async ({ connectionId, typing } = {}, ack) => {
    try {
      checkRate("chat:typing");
      ({ connectionId } = parse(validation.connectionParam, { connectionId }));
      if (typeof typing !== "boolean") throw new Error("Invalid chat event payload");
      await chatService.membership(connectionId, socket.user.id);
      socket.to(`chat:${connectionId}`).emit("chat:typing", { connectionId, userId: socket.user.id, typing });
      reply(ack, null, { connectionId });
    } catch (error) {
      reply(ack, error);
    }
  });

  socket.on("chat:read", async ({ connectionId } = {}, ack) => {
    try {
      checkRate("chat:read");
      ({ connectionId } = parse(validation.connectionParam, { connectionId }));
      const result = await chatService.markRead(socket.user.id, connectionId);
      reply(ack, null, result);
    } catch (error) {
      reply(ack, error);
    }
  });
}

module.exports = { registerChatHandlers };
