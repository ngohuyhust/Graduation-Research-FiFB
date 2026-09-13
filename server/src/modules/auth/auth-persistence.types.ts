import type { RequestMeta } from "./auth.types";
export interface StoredSession {
  user_id: string;
  refresh_token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
export interface StoredToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
}
export interface SessionPayload extends RequestMeta {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
}
export interface TokenPayload {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}
