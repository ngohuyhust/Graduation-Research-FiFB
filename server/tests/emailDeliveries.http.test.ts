jest.mock("@sendgrid/mail", () => ({ setApiKey: jest.fn(), send: jest.fn() }));
const request = require("supertest");
const sgMail = require("@sendgrid/mail");
const { createApp } = require("../src/app");
const { UsersRepository } = require("../src/modules/users/users.repository");
const { EmailDeliveriesRepository } = require("../src/modules/emailDeliveries/emailDeliveries.repository");
const { signAccessToken } = new (require("../src/modules/auth/jwt.service").JwtService)();
const { env } = require("../src/config/env");
const id = "d44b9038-7685-40c5-bb65-c075584c83ac";
describe("Nest email deliveries with mocked provider", () => {
  let app, repository, actor, config;
  const payload = {
    to: "recipient@example.com",
    subject: "Verify",
    html: "<p>Code</p>",
    templateKey: "email_verification",
  };
  beforeAll(async () => {
    app = await createApp();
    repository = app.locals.nest.get(EmailDeliveriesRepository);
  });
  afterAll(async () => {
    await app.locals.nest.close();
  });
  beforeEach(() => {
    config = { ...env.sendgrid };
    Object.assign(env.sendgrid, { apiKey: "SG.test", fromEmail: "sender@example.com", fromName: "FiFB" });
    actor = { id, role: "admin", status: "active", email_verified_at: "2026-01-01" };
    jest.spyOn(app.locals.nest.get(UsersRepository), "findById").mockImplementation(async () => actor);
    sgMail.send.mockResolvedValue([{ headers: { "x-message-id": "provider-1" } }]);
  });
  afterEach(() => {
    Object.assign(env.sendgrid, config);
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  const auth = (actor) => `Bearer ${signAccessToken(actor)}`;
  test("successful email updates shared delivery store visible to admin", async () => {
    await repository.sendEmail(null, payload);
    expect(sgMail.send).toHaveBeenCalledWith({
      to: payload.to,
      subject: "Verify",
      html: payload.html,
      text: "Verify",
      from: { email: "sender@example.com", name: "FiFB" },
    });
    const result = await request(app)
      .get("/api/admin/email-deliveries?limit=1")
      .set("Authorization", auth(actor))
      .expect(200);
    expect(result.body.data.items[0]).toMatchObject({
      recipient_email: payload.to,
      status: "sent",
      provider_message_id: "provider-1",
      template_key: payload.templateKey,
      sent_at: expect.any(String),
    });
  });
  test("provider failure records failed status and rethrows", async () => {
    const error = Object.assign(new Error("Provider rejected"), { response: { body: { errors: ["invalid"] } } });
    sgMail.send.mockRejectedValue(error);
    await expect(repository.sendEmail(null, payload)).rejects.toBe(error);
    expect(repository.listDeliveries()[0]).toMatchObject({
      status: "failed",
      error_message: JSON.stringify(error.response.body),
    });
  });
  test("missing configuration logs failure without contacting provider", async () => {
    env.sendgrid.apiKey = "";
    await expect(repository.sendEmail(null, payload)).rejects.toThrow("SendGrid configuration is incomplete");
    expect(sgMail.send).not.toHaveBeenCalled();
    expect(repository.listDeliveries()[0]).toMatchObject({
      status: "failed",
      error_message: "SendGrid configuration is incomplete",
    });
  });
  test("delivery logs remain admin-only and pagination is validated", async () => {
    await request(app).get("/api/admin/email-deliveries").expect(401);
    actor.role = "user";
    await request(app).get("/api/admin/email-deliveries").set("Authorization", auth(actor)).expect(403);
    actor.role = "admin";
    await request(app).get("/api/admin/email-deliveries?page=0").set("Authorization", auth(actor)).expect(400);
  });
});

export {};
