// Xu ly su kien chat realtime qua Socket.IO.
import { z } from "zod";
import * as validation from "../modules/chat/chat.validation";
import type { ChatService } from "../modules/chat/chat.service";
import type { AuthenticatedSocket } from "./index";
type Ack = (payload: { ok: boolean; error?: string; data?: unknown }) => void;

function parse<T extends z.ZodTypeAny>(schema: T, payload: unknown): z.infer<T> {
  const result = schema.safeParse(payload);
  if (!result.success) throw new Error("Invalid chat event payload");
  return result.data;
}

function reply(ack: Ack | undefined, error: unknown, data?: unknown) {
  if (typeof ack !== "function") return;
  if (error) {
    ack({ ok: false, error: error instanceof Error ? error.message : "Chat operation failed" });
  } else {
    ack({ ok: true, data });
  }
}

function createSocketRateLimiter(limits: Record<string, { max: number; windowMs: number }>) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function check(eventName: string) {
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

export function registerChatHandlers(socket: AuthenticatedSocket, chatService: ChatService) {
  const checkRate = createSocketRateLimiter({
    "chat:join": { max: 20, windowMs: 60_000 },
    "chat:send": { max: 30, windowMs: 60_000 },
    "chat:typing": { max: 60, windowMs: 60_000 },
    "chat:read": { max: 60, windowMs: 60_000 },
  });

  socket.on("chat:join", async ({ connectionId }: { connectionId?: string } = {}, ack?: Ack) => {
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

  socket.on(
    "chat:send",
    async (
      {
        connectionId,
        content,
        messageType = "text",
      }: { connectionId?: string; content?: string; messageType?: "text" | "image" } = {},
      ack?: Ack,
    ) => {
      try {
        checkRate("chat:send");
        ({ connectionId } = parse(validation.connectionParam, { connectionId }));
        const payload = parse(validation.messageSchema, { content, messageType });
        const result = await chatService.send(socket.user.id, connectionId, payload);
        reply(ack, null, result);
      } catch (error) {
        reply(ack, error);
      }
    },
  );

  socket.on(
    "chat:typing",
    async ({ connectionId, typing }: { connectionId?: string; typing?: boolean } = {}, ack?: Ack) => {
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
    },
  );

  socket.on("chat:read", async ({ connectionId }: { connectionId?: string } = {}, ack?: Ack) => {
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
