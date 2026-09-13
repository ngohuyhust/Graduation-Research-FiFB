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
