import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import { DatabaseService } from "../../db/database.service";
import type { QueryExecutor } from "../../db/database.service";
import type { UserRow, PasswordUserRow, CreateUser } from "./users.types";
import type { UpdateProfile, UsersQuery, UserStatus } from "./users.validation";

const selectable = `
  id, email, full_name, phone, avatar_url, role, status, email_verified_at,
  last_login_at, password_changed_at, fitness_goal, experience_level,
  gender, weight, height, created_at, updated_at
`;

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async createUser(client: PoolClient, user: CreateUser) {
    const result = await client.query<UserRow>(
      `INSERT INTO app_users (
       email, password_hash, full_name, phone, role, status,
       fitness_goal, experience_level, gender, weight, height
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${selectable}`,
      [
        user.email,
        user.passwordHash,
        user.fullName || null,
        user.phone,
        user.role || "user",
        user.status,
        user.fitnessGoal || null,
        user.experienceLevel || null,
        user.gender || null,
        user.weight || null,
        user.height || null,
      ],
    );
    return result.rows[0];
  }

  async findByEmail(email: string, client: QueryExecutor = this.database) {
    const result = await client.query<PasswordUserRow>(
      `SELECT *, password_hash FROM app_users WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
      [email],
    );
    return result.rows[0] || null;
  }

  async findById(id: string, client: QueryExecutor = this.database) {
    const result = await client.query<UserRow>(
      `SELECT ${selectable} FROM app_users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] || null;
  }

  async findAuthById(id: string, client: QueryExecutor = this.database) {
    const result = await client.query<PasswordUserRow>(
      `SELECT *, password_hash FROM app_users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] || null;
  }

  async updateProfile(id: string, payload: UpdateProfile) {
    const result = await this.database.query<UserRow>(
      `UPDATE app_users
     SET full_name = COALESCE($2, full_name),
         phone = COALESCE($3, phone),
         avatar_url = COALESCE($4, avatar_url),
         fitness_goal = COALESCE($5, fitness_goal),
         experience_level = COALESCE($6, experience_level),
         gender = COALESCE($7, gender),
         weight = COALESCE($8, weight),
         height = COALESCE($9, height),
         updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${selectable}`,
      [
        id,
        payload.fullName,
        payload.phone,
        payload.avatarUrl,
        payload.fitnessGoal,
        payload.experienceLevel,
        payload.gender,
        payload.weight,
        payload.height,
      ],
    );
    return result.rows[0] || null;
  }

  async updatePassword(client: PoolClient, id: string, passwordHash: string) {
    await client.query<UserRow>(
      `UPDATE app_users SET password_hash = $2, password_changed_at = now(), updated_at = now() WHERE id = $1`,
      [id, passwordHash],
    );
  }

  async markVerified(client: PoolClient, id: string) {
    const result = await client.query<UserRow>(
      `UPDATE app_users SET email_verified_at = now(), status = 'active', updated_at = now()
     WHERE id = $1 AND status = 'pending_verification'
     RETURNING ${selectable}`,
      [id],
    );
    return result.rows[0] || null;
  }

  async touchLastLogin(id: string) {
    await this.database.query<UserRow>("UPDATE app_users SET last_login_at = now(), updated_at = now() WHERE id = $1", [
      id,
    ]);
  }

  async listUsers({ page, limit, role, status, keyword }: UsersQuery) {
    const offset = (page - 1) * limit;
    const filters = ["deleted_at IS NULL"];
    const values: string[] = [];
    if (role) {
      values.push(role);
      filters.push(`role = $${values.length}`);
    }
    if (status) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }
    if (keyword) {
      values.push(`%${keyword}%`);
      filters.push(`(email ILIKE $${values.length} OR full_name ILIKE $${values.length})`);
    }
    const where = filters.join(" AND ");
    const count = await this.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM app_users WHERE ${where}`,
      values,
    );
    const result = await this.database.query<UserRow>(
      `SELECT ${selectable} FROM app_users WHERE ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    return { rows: result.rows, total: count.rows[0].total };
  }

  async setStatus(client: PoolClient, id: string, status: UserStatus) {
    const oldResult = await client.query<UserRow>(`SELECT ${selectable} FROM app_users WHERE id = $1`, [id]);
    const result = await client.query<UserRow>(
      `UPDATE app_users SET status = $2, updated_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING ${selectable}`,
      [id, status],
    );
    return { oldUser: oldResult.rows[0] || null, user: result.rows[0] || null };
  }
}
