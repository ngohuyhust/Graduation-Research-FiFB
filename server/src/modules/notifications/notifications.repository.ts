import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { QueryExecutor } from "../../db/database.service";
import type { NotificationQuery } from "./notifications.validation";
export interface NotificationPayload { recipientId: string; actorId?: string | null; type: string; title: string; content?: string | null; actionUrl?: string; isImportant?: boolean; metadata?: Record<string, unknown> }
const { emitToUser } = require("../../socket/emitters");




@Injectable()
export class NotificationsRepository {
  constructor(private readonly db: DatabaseService) {}

  async createNotification(client: QueryExecutor | null, payload: NotificationPayload) {
    const runner = client || this.db;
    const result = await runner.query<Record<string, unknown>>(
      `INSERT INTO notifications (recipient_id, actor_id, type, title, content, action_url, is_important, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        payload.recipientId,
        payload.actorId || null,
        payload.type,
        payload.title,
        payload.content || null,
        payload.actionUrl || null,
        payload.isImportant || false,
        payload.metadata || {},
      ],
    );
    const notification = result.rows[0];
    emitToUser(payload.recipientId, "notification:new", notification);
    const unread = await runner.query<{ total: number }>(
      "SELECT count(*)::int AS total FROM notifications WHERE recipient_id = $1 AND read_at IS NULL",
      [payload.recipientId],
    );
    emitToUser(payload.recipientId, "notification:count", unread.rows[0].total);
    return notification;
  }

  async listMine(userId: string, { page, limit }: NotificationQuery) {
    const offset = (page - 1) * limit;
    const count = await this.db.query<{ total: number }>(`SELECT count(*)::int AS total FROM notifications WHERE recipient_id = $1`, [userId]);
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return { rows: result.rows, total: count.rows[0].total };
  }

  async markRead(userId: string, id: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND recipient_id = $2 RETURNING *`,
      [id, userId],
    );
    const unread = await this.db.query<{ total: number }>(
      "SELECT count(*)::int AS total FROM notifications WHERE recipient_id = $1 AND read_at IS NULL",
      [userId],
    );
    emitToUser(userId, "notification:count", unread.rows[0].total);
    return result.rows[0] || null;
  }

  async markAllRead(userId: string) {
    await this.db.query<Record<string, unknown>>(
      `UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE recipient_id = $1 AND read_at IS NULL`,
      [userId],
    );
    emitToUser(userId, "notification:count", 0);
  }
}
