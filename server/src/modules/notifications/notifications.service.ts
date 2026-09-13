import { Injectable } from "@nestjs/common";
import { NotificationsRepository } from "./notifications.repository";
import type { NotificationQuery } from "./notifications.validation";
const { paginate } = require("../../utils/responses");




@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async listMine(userId: string, query: NotificationQuery) {
    const result = await this.repository.listMine(userId, query);
    return paginate({ items: result.rows, page: query.page, limit: query.limit, total: result.total });
  }

  async markRead(userId: string, id: string) {
    return { notification: await this.repository.markRead(userId, id) };
  }

  async markAllRead(userId: string) {
    await this.repository.markAllRead(userId);
  }
}
