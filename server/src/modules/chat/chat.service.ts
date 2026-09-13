import { Injectable } from "@nestjs/common";
import { ChatRepository } from "./chat.repository";
import type { MessagePayload, MessageQuery } from "./chat.validation";
const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");


export function ioInstance() {
  return require("../../socket").getIO();
}

@Injectable()
export class ChatService {
  constructor(private readonly repository: ChatRepository) {}

  async membership(connectionId: string, userId: string) {
    const connection = await this.repository.findMembership(connectionId, userId);
    if (!connection) throw new AppError(codes.FORBIDDEN, "Active trainer connection required", 403);
    return connection;
  }

  async list(userId: string, connectionId: string, filters: MessageQuery) {
    await this.membership(connectionId, userId);
    const result = await this.repository.listMessages(connectionId, filters);
    return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
  }

  async send(userId: string, connectionId: string, payload: MessagePayload) {
    await this.membership(connectionId, userId);
    const message = await this.repository.createMessage(connectionId, userId, payload);
    const io = ioInstance();
    if (io) io.to(`chat:${connectionId}`).emit("chat:receive", message);
    return { message };
  }

  async markRead(userId: string, connectionId: string) {
    await this.membership(connectionId, userId);
    const updated = await this.repository.markRead(connectionId, userId);
    const io = ioInstance();
    if (io) io.to(`chat:${connectionId}`).emit("chat:read", { connectionId, userId, updated });
    return { updated };
  }

  async unread(userId: string) {
    return { items: await this.repository.unreadCounts(userId) };
  }
}
