const nodemailer = require("nodemailer");
const { env } = require("../../config/env");

const memoryDeliveries = [];

function hasSmtpConfig() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}

async function logDelivery(_client, payload) {
  const row = {
    id: String(memoryDeliveries.length + 1),
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
  memoryDeliveries.push(row);
  return row;
}

async function sendEmail(client, { to, subject, html, text, templateKey, metadata, notificationId }) {
  if (!hasSmtpConfig()) {
    await logDelivery(client, {
      to,
      subject,
      templateKey,
      status: "failed",
      errorMessage: "SMTP configuration is incomplete",
      metadata,
      notificationId,
    });
    throw new Error("SMTP configuration is incomplete");
  }

  const pending = await logDelivery(client, {
    to,
    subject,
    templateKey,
    status: "pending",
    metadata,
    notificationId,
  });

  try {
    const result = await createTransporter().sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
      text,
    });
    pending.status = "sent";
    pending.sent_at = new Date().toISOString();
    pending.provider_message_id = result.messageId || null;
  } catch (error) {
    pending.status = "failed";
    pending.error_message = error.message;
    throw error;
  }
}

function listDeliveries() {
  return [...memoryDeliveries].reverse();
}

module.exports = { sendEmail, logDelivery, hasSmtpConfig, listDeliveries };
