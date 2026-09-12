import type { PoolClient } from "pg";
import type { RegisterPayload } from "./auth.validation";

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenUser {
  id: string;
  role: string;
  status: string;
  email_verified_at?: string | Date | null;
}

interface AuthUser extends TokenUser {
  email: string;
}

interface PasswordUser extends AuthUser {
  password_hash: string;
}

// Typed boundary for the users repository while that module remains CommonJS.
export interface AuthUserRepository {
  findByEmail(email: string, client?: PoolClient): Promise<PasswordUser | null>;
  findAuthById(id: string, client?: PoolClient): Promise<PasswordUser | null>;
  createUser(
    client: PoolClient,
    payload: RegisterPayload & { passwordHash: string; status: string },
  ): Promise<AuthUser>;
  touchLastLogin(id: string): Promise<void>;
  markVerified(client: PoolClient, id: string): Promise<AuthUser | null>;
  updatePassword(client: PoolClient, id: string, passwordHash: string): Promise<void>;
}
