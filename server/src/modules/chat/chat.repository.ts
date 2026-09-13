import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { MessagePayload, MessageQuery } from "./chat.validation";




@Injectable()
export class ChatRepository {
  constructor(private readonly db: DatabaseService) {}

  async findMembership(connectionId: string, userId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT utc.*, user_account.full_name AS user_name, trainer_account.full_name AS trainer_name
       FROM user_trainer_connections utc
       JOIN app_users user_account ON user_account.id = utc.user_id
       JOIN app_users trainer_account ON trainer_account.id = utc.trainer_id
       WHERE utc.id = $1 AND utc.status = 'active' AND ($2 = utc.user_id OR $2 = utc.trainer_id)`,
      [connectionId, userId],
    );
    return result.rows[0] || null;
  }

  async listMessages(connectionId: string, { page, limit }: MessageQuery) {
    const total = await this.db.query<{ total: number }>("SELECT count(*)::int AS total FROM chat_messages WHERE connection_id = $1", [
      connectionId,
    ]);
    const offset = Math.max(total.rows[0].total - page * limit, 0);
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT cm.*, u.full_name AS sender_name
       FROM chat_messages cm
       JOIN app_users u ON u.id = cm.sender_id
       WHERE cm.connection_id = $1
       ORDER BY cm.created_at ASC
       LIMIT $2 OFFSET $3`,
      [connectionId, limit, offset],
    );
    return { rows: result.rows, total: total.rows[0].total };
  }

  async createMessage(connectionId: string, senderId: string, payload: MessagePayload) {
    const result = await this.db.query<Record<string, unknown>>(
      `INSERT INTO chat_messages (connection_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [connectionId, senderId, payload.content, payload.messageType],
    );
    return result.rows[0];
  }

  async markRead(connectionId: string, userId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `UPDATE chat_messages
       SET read_at = COALESCE(read_at, now())
       WHERE connection_id = $1 AND sender_id <> $2 AND read_at IS NULL
       RETURNING id`,
      [connectionId, userId],
    );
    return result.rowCount;
  }

  async unreadCounts(userId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `SELECT cm.connection_id, count(*)::int AS unread_count
       FROM chat_messages cm
       JOIN user_trainer_connections utc ON utc.id = cm.connection_id
       WHERE utc.status = 'active'
         AND ($1 = utc.user_id OR $1 = utc.trainer_id)
         AND cm.sender_id <> $1
         AND cm.read_at IS NULL
       GROUP BY cm.connection_id`,
      [userId],
    );
    return result.rows;
  }
}
