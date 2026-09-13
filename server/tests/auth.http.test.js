const request = require("supertest");

jest.mock("../src/modules/emailDeliveries/emailDeliveries.repository", () => {
  const actual = jest.requireActual("../src/modules/emailDeliveries/emailDeliveries.repository");
  const sendEmail = jest.fn();
  class EmailDeliveriesRepository extends actual.EmailDeliveriesRepository { sendEmail(...args) { return sendEmail(...args); } }
  return { ...actual, EmailDeliveriesRepository, sendEmail };
});
const { createApp } = require("../src/app");
const { AuthService } = require("../src/modules/auth/auth.service");
const { signAccessToken } = require("../src/modules/auth/jwt.service");
const { UsersRepository } = require("../src/modules/users/users.repository");
const users = UsersRepository.prototype;
const { authRateLimiter } = require("../src/middlewares/rateLimiters");
const { env } = require("../src/config/env");
const { AppError } = require("../src/utils/errors/AppError");
const user = {
  id: "6ce85d13-eec0-4aa3-9b8f-905fa1fcd8fb",
  email: "test@example.com",
  role: "user",
  status: "active",
  full_name: "Test User",
  password_hash: "private-hash",
  email_verified_at: "2026-01-01",
};
const cookieName = "fifb_refresh_token";
const expiry = new Date(Date.now() + 86400000);
const tokens = { accessToken: "access-value", refreshToken: "refresh-value", expiresAt: expiry };
const registration = { email: user.email, password: "password123", phone: "0900000000", gender: "male" };

describe("Nest auth HTTP contract", () => {
  let app;
  let service;
  beforeAll(async () => {
    app = await createApp();
    service = app.locals.nest.get(AuthService);
  });
  afterAll(async () => {
    await app.locals.nest.close();
  });
  beforeEach(() => {
    jest.spyOn(users, "findById");
    authRateLimiter.resetKey("::ffff:127.0.0.1");
    authRateLimiter.resetKey("127.0.0.1");
    users.findById.mockResolvedValue(user);
    for (const name of [
      "register",
      "login",
      "refresh",
      "logout",
      "verifyEmail",
      "requestPasswordReset",
      "resetPassword",
      "changePassword",
    ]) {
      jest.spyOn(service, name).mockResolvedValue(undefined);
    }
    service.register.mockResolvedValue({ user });
    service.verifyEmail.mockResolvedValue({ user });
    service.login.mockResolvedValue(tokens);
    service.refresh.mockResolvedValue(tokens);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("register uses Nest service, returns 201 and hides credentials", async () => {
    expect(service).toBeInstanceOf(AuthService);
    const response = await request(app).post("/api/auth/register").send(registration).expect(201);
    expect(service.register).toHaveBeenCalledWith({ ...registration, role: "user" });
    expect(response.body).toMatchObject({
      success: true,
      data: { user: { id: user.id, fullName: "Test User" } },
      message: "Registration created. Check email to verify account.",
    });
    expect(response.body.data.user.password_hash).toBeUndefined();
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  test.each([
    ["register", { ...registration, role: "admin" }],
    ["register", { ...registration, phone: "" }],
    ["login", { email: "invalid", password: "password123" }],
    ["verify-email", { email: user.email, otp: "12345" }],
    ["request-password-reset", { email: "invalid" }],
    ["reset-password", { token: "short", newPassword: "short" }],
  ])("%s invalid body preserves validation envelope", async (path, body) => {
    const response = await request(app)
      .post(`/api/auth/${path}`)
      .set("X-Request-Id", "auth-input")
      .send(body)
      .expect(400);
    expect(response.body).toMatchObject({
      success: false,
      requestId: "auth-input",
      error: { code: "VALIDATION_ERROR", message: "Request validation failed" },
    });
    expect(service.register).not.toHaveBeenCalled();
    expect(service.login).not.toHaveBeenCalled();
    expect(service.verifyEmail).not.toHaveBeenCalled();
    expect(service.requestPasswordReset).not.toHaveBeenCalled();
    expect(service.resetPassword).not.toHaveBeenCalled();
  });

  test("login keeps HTTP-only refresh cookie and session metadata, without exposing refresh token in JSON", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("User-Agent", "auth-test")
      .send({ email: user.email, password: "password123" })
      .expect(200);
    expect(response.body).toEqual({
      success: true,
      data: { accessToken: tokens.accessToken, expiresAt: expiry.toISOString() },
      message: "Logged in",
    });
    expect(service.login).toHaveBeenCalledWith(
      { email: user.email, password: "password123" },
      expect.objectContaining({ userAgent: "auth-test", ipAddress: expect.any(String) }),
    );
    const cookie = response.headers["set-cookie"][0];
    expect(cookie).toContain(`${cookieName}=refresh-value`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/api/auth");
    expect(cookie).toMatch(/SameSite=(Lax|Strict)/);
    expect(cookie).toContain("Expires=");
  });

  test("production cookie is Secure", async () => {
    const previous = env.nodeEnv;
    env.nodeEnv = "production";
    try {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "password123" })
        .expect(200);
      expect(response.headers["set-cookie"][0]).toContain("Secure");
    } finally {
      env.nodeEnv = previous;
    }
  });

  test("refresh reads only the cookie and rotates it", async () => {
    await request(app).post("/api/auth/refresh").send({ refreshToken: "body-token" }).expect(401);
    expect(service.refresh).not.toHaveBeenCalled();
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${cookieName}=old%2Btoken`)
      .set("User-Agent", "refresh-test")
      .send({ refreshToken: "ignored" })
      .expect(200);
    expect(service.refresh).toHaveBeenCalledWith("old+token", expect.objectContaining({ userAgent: "refresh-test" }));
    expect(response.body.message).toBe("Token refreshed");
    expect(response.body.data.refreshToken).toBeUndefined();
    expect(response.headers["set-cookie"][0]).toContain(`${cookieName}=refresh-value`);
  });

  test("logout revokes cookie session, clears cookie and returns empty 204, including when no cookie exists", async () => {
    const response = await request(app).post("/api/auth/logout").set("Cookie", `${cookieName}=old-token`).expect(204);
    expect(service.logout).toHaveBeenCalledWith("old-token");
    expect(response.text).toBe("");
    expect(response.headers["set-cookie"][0]).toContain(`${cookieName}=;`);
    expect(response.headers["set-cookie"][0]).toContain("Path=/api/auth");
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    const absent = await request(app).post("/api/auth/logout").send({ refreshToken: "ignored" }).expect(204);
    expect(absent.text).toBe("");
    expect(service.logout).toHaveBeenCalledTimes(1);
  });

  test("me uses the shared JWT verifier and sanitized user presenter", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${signAccessToken(user)}`)
      .expect(200);
    expect(users.findById).toHaveBeenCalledWith(user.id);
    expect(response.body).toMatchObject({
      success: true,
      data: { user: { id: user.id, fullName: "Test User" } },
      message: "OK",
    });
    expect(response.body.data.user.password_hash).toBeUndefined();
  });

  test.each(["me", "change-password"])("%s keeps authentication, active-user and email guards", async (path) => {
    const send = () =>
      path === "me"
        ? request(app).get(`/api/auth/${path}`)
        : request(app).post(`/api/auth/${path}`).send({ currentPassword: "old", newPassword: "new-password" });
    await send().expect(401);
    await send().set("Authorization", "Bearer invalid").expect(401);
    for (const overrides of [{ status: "locked" }, { email_verified_at: null }]) {
      users.findById.mockResolvedValue({ ...user, ...overrides });
      await send()
        .set("Authorization", `Bearer ${signAccessToken(user)}`)
        .expect(403);
    }
    expect(service.changePassword).not.toHaveBeenCalled();
  });

  test("change password passes actor and validates input, then returns empty 204", async () => {
    const token = signAccessToken(user);
    await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "old", newPassword: "short" })
      .expect(400);
    expect(service.changePassword).not.toHaveBeenCalled();
    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "old", newPassword: "new-password" })
      .expect(204);
    expect(response.text).toBe("");
    expect(service.changePassword).toHaveBeenCalledWith(user.id, "old", "new-password");
  });

  test("email verification trims OTP and keeps 200 response", async () => {
    const response = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: user.email, otp: " 123456 " })
      .expect(200);
    expect(service.verifyEmail).toHaveBeenCalledWith(user.email, "123456");
    expect(response.body.message).toBe("Email verified");
    expect(response.body.data.user.password_hash).toBeUndefined();
  });

  test("password reset request keeps generic response and reset returns empty 204", async () => {
    const response = await request(app)
      .post("/api/auth/request-password-reset")
      .send({ email: user.email })
      .expect(200);
    expect(response.body).toEqual({
      success: true,
      data: null,
      message: "If the email exists, a reset link has been sent",
    });
    expect(service.requestPasswordReset).toHaveBeenCalledWith(user.email);
    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "a".repeat(32), newPassword: "new-password" })
      .expect(204);
    expect(reset.text).toBe("");
    expect(service.resetPassword).toHaveBeenCalledWith("a".repeat(32), "new-password");
  });

  test("service rejection preserves error envelope and does not issue cookies", async () => {
    service.login.mockRejectedValue(new AppError("UNAUTHENTICATED", "Invalid email or password", 401));
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong" })
      .expect(401);
    expect(response.body.error).toMatchObject({ code: "UNAUTHENTICATED", message: "Invalid email or password" });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  test("five public POST endpoints share the existing 20-request limit before validation", async () => {
    const paths = ["register", "login", "request-password-reset", "reset-password", "verify-email"];
    for (let i = 0; i < 20; i++) {
      await request(app)
        .post(`/api/auth/${paths[i % paths.length]}`)
        .send({})
        .expect(400);
    }
    for (const path of paths) {
      const response = await request(app)
        .post(`/api/auth/${path}`)
        .set("X-Request-Id", "auth-limit")
        .send({})
        .expect(429);
      expect(response.body).toEqual({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many auth attempts. Try again later.", details: null },
        requestId: "auth-limit",
      });
      expect(response.headers["retry-after"]).toBeDefined();
    }
    await request(app).post("/api/auth/logout").expect(204);
    await request(app).post("/api/auth/refresh").set("Cookie", `${cookieName}=old-token`).expect(200);
    await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${signAccessToken(user)}`)
      .expect(200);
    await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${signAccessToken(user)}`)
      .send({ currentPassword: "old", newPassword: "new-password" })
      .expect(204);
    await request(app).get("/api/auth/login").expect(404);
    await request(app).post("/api/auth/unknown").expect(404);
  });
});
