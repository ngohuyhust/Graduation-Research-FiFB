const chatService = require("../modules/chat/chat.service");
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

function registerChatHandlers(socket) {
  socket.on("chat:join", async ({ connectionId } = {}, ack) => {
    try {
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
      ({ connectionId } = parse(validation.connectionParam, { connectionId }));
      const result = await chatService.markRead(socket.user.id, connectionId);
      reply(ack, null, result);
    } catch (error) {
      reply(ack, error);
    }
  });
}

module.exports = { registerChatHandlers };
