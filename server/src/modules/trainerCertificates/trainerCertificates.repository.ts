import type { Actor } from "../../common/auth.guard";
import type { PoolClient } from "pg";
import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import type { CertificatePayload, CertificateDecision, CertificateQuery } from "./trainerCertificates.validation";
import type { CertificateRow } from "./trainerCertificates.types";

@Injectable()
export class TrainerCertificatesRepository {
  constructor(private readonly database: DatabaseService) {}

  async ensureTrainerProfile(client: PoolClient, trainerId: string) {
    const result = await client.query<{ trainer_id: string }>(
      "SELECT trainer_id FROM trainer_profiles WHERE trainer_id = $1",
      [trainerId],
    );
    return Boolean(result.rows[0]);
  }

  async create(client: PoolClient, trainerId: string, payload: CertificatePayload) {
    const result = await client.query<CertificateRow>(
      `INSERT INTO trainer_certificates (trainer_id, title, issuer, certificate_url, certificate_number, verification_url, issued_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        trainerId,
        payload.title,
        payload.issuer || null,
        payload.certificateUrl || null,
        payload.certificateNumber || null,
        payload.verificationUrl || null,
        payload.issuedAt || null,
        payload.expiresAt || null,
      ],
    );
    return result.rows[0];
  }

  async listByTrainer(trainerId: string) {
    const result = await this.database.query<CertificateRow>(
      "SELECT * FROM trainer_certificates WHERE trainer_id = $1 ORDER BY created_at DESC",
      [trainerId],
    );
    return result.rows;
  }

  async listAll({ page, limit, status }: CertificateQuery) {
    const values: unknown[] = [];
    const filters = ["1 = 1"];
    if (status) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }
    const where = filters.join(" AND ");
    const count = await this.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM trainer_certificates WHERE ${where}`,
      values,
    );
    const result = await this.database.query<CertificateRow>(
      `SELECT * FROM trainer_certificates WHERE ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, (page - 1) * limit],
    );
    return { rows: result.rows, total: count.rows[0].total };
  }

  async findById(client: PoolClient, id: string) {
    const result = await client.query<CertificateRow>("SELECT * FROM trainer_certificates WHERE id = $1", [id]);
    return result.rows[0] || null;
  }

  async setReviewStatus(client: PoolClient, id: string, actor: Actor, decision: CertificateDecision) {
    const result = await client.query<CertificateRow>(
      `UPDATE trainer_certificates
     SET status = $2,
         reviewed_by = $3,
         reviewed_at = now(),
         rejection_reason = CASE WHEN $2 = 'rejected' THEN $4 ELSE NULL END,
         updated_at = now()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
      [id, decision.status, actor.userId, decision.rejectionReason || null],
    );
    return result.rows[0] || null;
  }
}
