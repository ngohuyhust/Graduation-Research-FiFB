export interface CertificateRow extends Record<string, unknown> {
  id: string;
  trainer_id: string;
  title: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | string | null;
}
