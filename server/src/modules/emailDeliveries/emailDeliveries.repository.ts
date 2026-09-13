import { Injectable } from "@nestjs/common";
import type { QueryExecutor } from "../../db/database.service";
import type { EmailPayload, DeliveryPayload, DeliveryRow } from "./emailDeliveries.types";
import sgMail from "@sendgrid/mail";
const { env } = require("../../config/env");

@Injectable()
export class EmailDeliveriesRepository {
  private readonly memoryDeliveries: DeliveryRow[] = [];

  hasSendGridConfig() {
    return Boolean(env.sendgrid.apiKey && env.sendgrid.fromEmail);
  }

  createSendGridMessage({ to, subject, html, text }: Pick<EmailPayload, "to" | "subject" | "html" | "text">) {
    const message: { to: string; from: { email: string; name: string }; subject: string; text: string; html?: string } =
      {
        to,
        from: {
          email: env.sendgrid.fromEmail,
          name: env.sendgrid.fromName,
        },
        subject,
        text: text || subject,
      };
    if (html) message.html = html;
    return message;
  }

  async sendWithSendGrid(message: ReturnType<EmailDeliveriesRepository["createSendGridMessage"]>) {
    sgMail.setApiKey(env.sendgrid.apiKey);
    const [response] = await sgMail.send(message);
    return response?.headers?.["x-message-id"] || null;
  }

  async logDelivery(_client: QueryExecutor | null, payload: DeliveryPayload) {
    const row: DeliveryRow = {
      id: String(this.memoryDeliveries.length + 1),
      notification_id: payload.notificationId || null,
      recipient_email: payload.to,
      subject: payload.subject,
      template_key: payload.templateKey,
      status: payload.status,
      provider_message_id: payload.providerMessageId || null,
      error_message: payload.errorMessage || null,
      metadata: payload.metadata || {},
      created_at: new Date().toISOString(),
    };
    this.memoryDeliveries.push(row);
    return row;
  }

  async sendEmail(
    client: QueryExecutor | null,
    { to, subject, html, text, templateKey, metadata, notificationId }: EmailPayload,
  ) {
    if (!this.hasSendGridConfig()) {
      await this.logDelivery(client, {
        to,
        subject,
        templateKey,
        status: "failed",
        errorMessage: "SendGrid configuration is incomplete",
        metadata,
        notificationId,
      });
      throw new Error("SendGrid configuration is incomplete");
    }

    const pending = await this.logDelivery(client, {
      to,
      subject,
      templateKey,
      status: "pending",
      metadata,
      notificationId,
    });

    try {
      const messageId = await this.sendWithSendGrid(this.createSendGridMessage({ to, subject, html, text }));
      pending.status = "sent";
      pending.sent_at = new Date().toISOString();
      pending.provider_message_id = messageId || null;
    } catch (error) {
      pending.status = "failed";
      const providerError = error as { response?: { body?: unknown }; message?: string };
      pending.error_message = providerError.response?.body
        ? JSON.stringify(providerError.response.body)
        : providerError.message || String(error);
      throw error;
    }
  }

  listDeliveries() {
    return [...this.memoryDeliveries].reverse();
  }
}
