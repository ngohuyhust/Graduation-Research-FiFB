import type { PoolClient } from "pg";
import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { ConnectionRequestPayload } from "./trainerConnections.validation";
import type { ConnectionRequestRow, ConnectionRow } from "./trainerConnections.types";

@Injectable()
export class TrainerConnectionsRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPending(client: PoolClient, userId: string, trainerId: string) {
    const result = await client.query<Record<string, number>>(
      "SELECT 1 FROM trainer_connection_requests WHERE user_id = $1 AND trainer_id = $2 AND status = 'pending'",
      [userId, trainerId],
    );
    return result.rows[0] || null;
  }

  async findActiveConnection(client: PoolClient, userId: string, trainerId: string) {
    const result = await client.query<Record<string, number>>(
      "SELECT 1 FROM user_trainer_connections WHERE user_id = $1 AND trainer_id = $2 AND status = 'active'",
      [userId, trainerId],
    );
    return result.rows[0] || null;
  }

  async findTrainerProfile(client: PoolClient, trainerId: string) {
    const result = await client.query<{ trainer_id: string }>(
      `SELECT tp.trainer_id
     FROM trainer_profiles tp
     JOIN app_users u ON u.id = tp.trainer_id
     WHERE tp.trainer_id = $1 AND u.role = 'trainer' AND u.status = 'active' AND u.deleted_at IS NULL`,
      [trainerId],
    );
    return result.rows[0] || null;
  }

  async createRequest(client: PoolClient, userId: string, payload: ConnectionRequestPayload) {
    const result = await client.query<ConnectionRequestRow>(
      `INSERT INTO trainer_connection_requests (user_id, trainer_id, goal_snapshot, message)
     VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, payload.trainerId, payload.goalSnapshot || null, payload.message || null],
    );
    return result.rows[0];
  }

  async cancel(userId: string, id: string) {
    const result = await this.database.query<ConnectionRequestRow>(
      `UPDATE trainer_connection_requests SET status = 'cancelled', cancelled_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING *`,
      [id, userId],
    );
    return result.rows[0] || null;
  }

  async findPendingForTrainer(client: PoolClient, id: string, trainerId: string) {
    const result = await client.query<ConnectionRequestRow>(
      "SELECT * FROM trainer_connection_requests WHERE id = $1 AND trainer_id = $2 AND status = 'pending'",
      [id, trainerId],
    );
    return result.rows[0] || null;
  }

  async setDecision(client: PoolClient, id: string, status: "approved" | "rejected", rejectReason?: string) {
    const result = await client.query<ConnectionRequestRow>(
      "UPDATE trainer_connection_requests SET status = $2, reject_reason = $3, responded_at = now(), updated_at = now() WHERE id = $1 AND status = 'pending' RETURNING *",
      [id, status, rejectReason || null],
    );
    return result.rows[0] || null;
  }

  async createConnection(client: PoolClient, request: ConnectionRequestRow) {
    await client.query<ConnectionRequestRow>(
      "INSERT INTO user_trainer_connections (user_id, trainer_id, request_id) VALUES ($1, $2, $3)",
      [request.user_id, request.trainer_id, request.id],
    );
  }

  async listRequests(user: { id: string; role: string }) {
    const result = await this.database.query<ConnectionRequestRow>(
      user.role === "trainer"
        ? `SELECT tcr.*,
           requester.full_name AS user_name,
           requester.email AS user_email,
           requester.avatar_url AS user_avatar_url,
           utc.id AS connection_id,
           utc.status AS connection_status
         FROM trainer_connection_requests tcr
         JOIN app_users requester ON requester.id = tcr.user_id
         LEFT JOIN user_trainer_connections utc ON utc.request_id = tcr.id
         WHERE tcr.trainer_id = $1
         ORDER BY tcr.created_at DESC`
        : `SELECT tcr.*,
           trainer.full_name AS trainer_name,
           trainer.email AS trainer_email,
           trainer.avatar_url AS trainer_avatar_url,
           utc.id AS connection_id,
           utc.status AS connection_status
         FROM trainer_connection_requests tcr
         JOIN app_users trainer ON trainer.id = tcr.trainer_id
         LEFT JOIN user_trainer_connections utc ON utc.request_id = tcr.id
         WHERE tcr.user_id = $1
         ORDER BY tcr.created_at DESC`,
      [user.id],
    );
    return result.rows;
  }

  async listConnections(user: { id: string; role: string }) {
    const chatMessagesExists = await this.database.query<{ table_name: string | null }>(
      "SELECT to_regclass('public.chat_messages') AS table_name",
    );
    const hasChatMessages = Boolean(chatMessagesExists.rows[0]?.table_name);
    if (!hasChatMessages) {
      const result = await this.database.query<ConnectionRow>(
        user.role === "trainer"
          ? `SELECT utc.*, other.full_name AS user_name, 0::int AS unread_count
           FROM user_trainer_connections utc
           JOIN app_users other ON other.id = utc.user_id
           WHERE utc.trainer_id = $1
           ORDER BY utc.connected_at DESC`
          : `SELECT utc.*, other.full_name AS trainer_name, 0::int AS unread_count
           FROM user_trainer_connections utc
           JOIN app_users other ON other.id = utc.trainer_id
           WHERE utc.user_id = $1
           ORDER BY utc.connected_at DESC`,
        [user.id],
      );
      return result.rows;
    }

    const result = await this.database.query<ConnectionRow>(
      user.role === "trainer"
        ? `SELECT utc.*, other.full_name AS user_name,
           count(cm.id) FILTER (WHERE cm.sender_id <> $1 AND cm.read_at IS NULL)::int AS unread_count
         FROM user_trainer_connections utc
         JOIN app_users other ON other.id = utc.user_id
         LEFT JOIN chat_messages cm ON cm.connection_id = utc.id
         WHERE utc.trainer_id = $1
         GROUP BY utc.id, other.full_name
         ORDER BY utc.connected_at DESC`
        : `SELECT utc.*, other.full_name AS trainer_name,
           count(cm.id) FILTER (WHERE cm.sender_id <> $1 AND cm.read_at IS NULL)::int AS unread_count
         FROM user_trainer_connections utc
         JOIN app_users other ON other.id = utc.trainer_id
         LEFT JOIN chat_messages cm ON cm.connection_id = utc.id
         WHERE utc.user_id = $1
         GROUP BY utc.id, other.full_name
         ORDER BY utc.connected_at DESC`,
      [user.id],
    );
    return result.rows;
  }
}
