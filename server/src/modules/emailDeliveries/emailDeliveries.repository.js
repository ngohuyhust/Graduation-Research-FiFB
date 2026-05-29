const sgMail = require("@sendgrid/mail");
const { env } = require("../../config/env");

const memoryDeliveries = [];

function hasSendGridConfig() {
  return Boolean(env.sendgrid.apiKey && env.sendgrid.fromEmail);
}

function createSendGridMessage({ to, subject, html, text }) {
  const message = {
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

async function sendWithSendGrid(message) {
  sgMail.setApiKey(env.sendgrid.apiKey);
  const [response] = await sgMail.send(message);
  return response?.headers?.["x-message-id"] || null;
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
  if (!hasSendGridConfig()) {
    await logDelivery(client, {
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

  const pending = await logDelivery(client, {
    to,
    subject,
    templateKey,
    status: "pending",
    metadata,
    notificationId,
  });

  try {
    const messageId = await sendWithSendGrid(createSendGridMessage({ to, subject, html, text }));
    pending.status = "sent";
    pending.sent_at = new Date().toISOString();
    pending.provider_message_id = messageId || null;
  } catch (error) {
    pending.status = "failed";
    pending.error_message = error.response?.body ? JSON.stringify(error.response.body) : error.message;
    throw error;
  }
}

function listDeliveries() {
  return [...memoryDeliveries].reverse();
}

module.exports = { sendEmail, logDelivery, hasSendGridConfig, listDeliveries };
