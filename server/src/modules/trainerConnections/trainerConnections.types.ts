export interface ConnectionRequestRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  trainer_id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  goal_snapshot: string | null;
  message: string | null;
  reject_reason: string | null;
}

export interface ConnectionRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  trainer_id: string;
  request_id: string;
  status: string;
  unread_count: number;
}
