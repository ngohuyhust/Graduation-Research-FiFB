export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateKey: string;
  metadata?: Record<string, unknown>;
  notificationId?: string;
}
export interface DeliveryPayload extends EmailPayload {
  status: "pending" | "sent" | "failed";
  providerMessageId?: string | null;
  errorMessage?: string;
}
export interface DeliveryRow {
  id: string;
  notification_id: string | null;
  recipient_email: string;
  subject: string;
  template_key: string;
  status: DeliveryPayload["status"];
  provider_message_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  sent_at?: string;
}
