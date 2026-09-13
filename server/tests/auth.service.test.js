jest.mock("../src/db/pool", () => ({ withTransaction: jest.fn() }));
jest.mock("bcryptjs", () => ({ hash: jest.fn(), compare: jest.fn() }));
jest.mock("../src/modules/emailDeliveries/emailDeliveries.repository", () => {
  const actual = jest.requireActual("../src/modules/emailDeliveries/emailDeliveries.repository");
  const sendEmail = jest.fn();
  class EmailDeliveriesRepository extends actual.EmailDeliveriesRepository { sendEmail(...args) { return sendEmail(...args); } }
  return { ...actual, EmailDeliveriesRepository, sendEmail };
});
jest.mock("../src/utils/logger", () => ({ logger: { warn: jest.fn() } }));

const { AuthService } = require("../src/modules/auth/auth.service");
const { withTransaction } = require("../src/db/pool");
const { sendEmail } = require("../src/modules/emailDeliveries/emailDeliveries.repository");
const { hashToken } = require("../src/utils/tokens");
const { verifyAccessToken } = new (require("../src/modules/auth/jwt.service").JwtService)();
const bcrypt = require("bcryptjs");
const user = {
  id: "user-id",
  email: "test@example.com",
  role: "user",
  status: "active",
  password_hash: "old-hash",
  email_verified_at: "2026-01-01",
};
const meta = { ipAddress: "127.0.0.1", userAgent: "service-test" };

describe("Nest auth service", () => {
  let service;
  let repository;
  let users;
  let client;
  beforeEach(() => {
    jest.resetAllMocks();
    client = { query: jest.fn() };
    withTransaction.mockImplementation((callback) => callback(client));
    bcrypt.hash.mockResolvedValue("new-hash");
    bcrypt.compare.mockResolvedValue(true);
    repository = Object.fromEntries(
      [
        "createSession",
        "findSessionByHash",
        "revokeSessionByHash",
        "revokeUserSessions",
        "createVerificationToken",
        "findVerificationToken",
        "markVerificationUsed",
        "createPasswordResetToken",
        "findPasswordResetToken",
        "markPasswordResetUsed",
      ].map((name) => [name, jest.fn()]),
    );
    users = Object.fromEntries(
      ["findByEmail", "findAuthById", "createUser", "touchLastLogin", "markVerified", "updatePassword"].map((name) => [
        name,
        jest.fn(),
      ]),
    );
    users.createUser.mockResolvedValue(user);
    users.markVerified.mockResolvedValue(user);
    service = new AuthService(new (require("../src/db/database.service").DatabaseService)(), new (require("../src/modules/auth/jwt.service").JwtService)(), new (require("../src/modules/emailDeliveries/emailDeliveries.repository").EmailDeliveriesRepository)(), repository, users);
  });

  test.each(["user", "trainer"])(
    "%s registration hashes password and OTP and sends email after the transaction",
    async (role) => {
      let committed = false;
      withTransaction.mockImplementation(async (callback) => {
        const result = await callback(client);
        committed = true;
        return result;
      });
      sendEmail.mockImplementation(async () => {
        expect(committed).toBe(true);
      });
      const result = await service.register({
        email: " TEST@example.com ",
        password: "password123",
        role,
        phone: "0900000000",
        gender: "male",
      });
      expect(result).toEqual({ user });
      expect(users.findByEmail).toHaveBeenCalledWith("test@example.com", client);
      expect(users.createUser).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          email: "test@example.com",
          passwordHash: "new-hash",
          status: "pending_verification",
        }),
      );
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", expect.any(Number));
      if (role === "trainer")
        expect(client.query).toHaveBeenCalledWith("INSERT INTO trainer_profiles (trainer_id) VALUES ($1)", [user.id]);
      else expect(client.query).not.toHaveBeenCalled();
      const email = sendEmail.mock.calls[0][1];
      const otp = email.text.match(/code is (\d{6})/)[1];
      expect(repository.createVerificationToken).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          userId: user.id,
          tokenHash: hashToken(`${user.email}:${otp}`),
          expiresAt: expect.any(Date),
        }),
      );
      expect(email.to).toBe(user.email);
    },
  );

  test("duplicate registration does not create credentials or send email", async () => {
    users.findByEmail.mockResolvedValue(user);
    await expect(service.register({ email: user.email })).rejects.toMatchObject({ statusCode: 409 });
    expect(users.createUser).not.toHaveBeenCalled();
    expect(repository.createVerificationToken).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test("login normalizes email and creates a hashed refresh session with compatible access JWT", async () => {
    users.findByEmail.mockResolvedValue(user);
    const result = await service.login({ email: " TEST@example.com ", password: "password123" }, meta);
    expect(users.findByEmail).toHaveBeenCalledWith("test@example.com");
    expect(bcrypt.compare).toHaveBeenCalledWith("password123", "old-hash");
    expect(users.touchLastLogin).toHaveBeenCalledWith(user.id);
    expect(verifyAccessToken(result.accessToken)).toMatchObject({ sub: user.id, role: user.role, status: user.status });
    expect(repository.createSession).toHaveBeenCalledWith(client, {
      userId: user.id,
      refreshTokenHash: hashToken(result.refreshToken),
      expiresAt: result.expiresAt,
      ...meta,
    });
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test.each([
    [null, true, 401],
    [user, false, 401],
    [{ ...user, status: "locked" }, true, 403],
    [{ ...user, email_verified_at: null }, true, 403],
  ])("login rejects invalid credentials or account state %#", async (record, matches, statusCode) => {
    users.findByEmail.mockResolvedValue(record);
    bcrypt.compare.mockResolvedValue(matches);
    await expect(service.login({ email: user.email, password: "wrong" }, meta)).rejects.toMatchObject({ statusCode });
    expect(repository.createSession).not.toHaveBeenCalled();
    expect(users.touchLastLogin).not.toHaveBeenCalled();
  });

  test("refresh revokes the old hash before issuing a replacement for the current user", async () => {
    repository.findSessionByHash.mockResolvedValue({
      user_id: user.id,
      role: "trainer",
      status: "active",
      email_verified_at: "2026-01-01",
    });
    const result = await service.refresh("old-refresh-token", meta);
    expect(repository.findSessionByHash).toHaveBeenCalledWith(client, hashToken("old-refresh-token"));
    expect(repository.revokeSessionByHash).toHaveBeenCalledWith(client, hashToken("old-refresh-token"));
    expect(repository.revokeSessionByHash.mock.invocationCallOrder[0]).toBeLessThan(
      repository.createSession.mock.invocationCallOrder[0],
    );
    expect(result.refreshToken).not.toBe("old-refresh-token");
    expect(verifyAccessToken(result.accessToken)).toMatchObject({ sub: user.id, role: "trainer" });
  });

  test.each([
    [null, 401],
    [{ status: "locked" }, 403],
    [{ status: "active", email_verified_at: null }, 403],
  ])("refresh rejects invalid session or account state %#", async (session, statusCode) => {
    repository.findSessionByHash.mockResolvedValue(session);
    await expect(service.refresh("old-token", meta)).rejects.toMatchObject({ statusCode });
    expect(repository.revokeSessionByHash).not.toHaveBeenCalled();
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  test("logout revokes only the supplied refresh session", async () => {
    await service.logout("logout-token");
    expect(repository.revokeSessionByHash).toHaveBeenCalledWith(client, hashToken("logout-token"));
    expect(repository.revokeUserSessions).not.toHaveBeenCalled();
  });

  test("verification binds the OTP to normalized email and consumes it", async () => {
    repository.findVerificationToken.mockResolvedValue({ id: "otp-id", user_id: user.id });
    await expect(service.verifyEmail(" TEST@example.com ", "123456")).resolves.toEqual({ user });
    expect(repository.findVerificationToken).toHaveBeenCalledWith(client, hashToken("test@example.com:123456"));
    expect(repository.markVerificationUsed).toHaveBeenCalledWith(client, "otp-id");
    expect(users.markVerified).toHaveBeenCalledWith(client, user.id);
  });

  test("invalid verification OTP never activates the user", async () => {
    repository.findVerificationToken.mockResolvedValue(null);
    await expect(service.verifyEmail(user.email, "123456")).rejects.toMatchObject({ statusCode: 400 });
    expect(users.markVerified).not.toHaveBeenCalled();
    expect(repository.markVerificationUsed).not.toHaveBeenCalled();
  });

  test("password reset request is silent for unknown email", async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(service.requestPasswordReset(user.email)).resolves.toBeUndefined();
    expect(repository.createPasswordResetToken).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test("password reset stores only token hash and sends the reset link after transaction", async () => {
    users.findByEmail.mockResolvedValue(user);
    let committed = false;
    withTransaction.mockImplementation(async (callback) => {
      const result = await callback(client);
      committed = true;
      return result;
    });
    sendEmail.mockImplementation(async () => {
      expect(committed).toBe(true);
    });
    await service.requestPasswordReset(" TEST@example.com ");
    const email = sendEmail.mock.calls[0][1];
    const token = new URL(email.text.replace("Reset your password: ", "")).searchParams.get("token");
    expect(repository.createPasswordResetToken).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ userId: user.id, tokenHash: hashToken(token) }),
    );
    expect(users.findByEmail).toHaveBeenCalledWith("test@example.com");
  });

  test("reset consumes token and revokes all sessions after changing password", async () => {
    repository.findPasswordResetToken.mockResolvedValue({ id: "reset-id", user_id: user.id });
    await service.resetPassword("reset-token", "new-password");
    expect(repository.findPasswordResetToken).toHaveBeenCalledWith(client, hashToken("reset-token"));
    expect(users.updatePassword).toHaveBeenCalledWith(client, user.id, "new-hash");
    expect(repository.markPasswordResetUsed).toHaveBeenCalledWith(client, "reset-id");
    expect(repository.revokeUserSessions).toHaveBeenCalledWith(client, user.id);
  });

  test("invalid reset token cannot change password or revoke sessions", async () => {
    repository.findPasswordResetToken.mockResolvedValue(null);
    await expect(service.resetPassword("bad-token", "new-password")).rejects.toMatchObject({ statusCode: 400 });
    expect(users.updatePassword).not.toHaveBeenCalled();
    expect(repository.revokeUserSessions).not.toHaveBeenCalled();
  });

  test("password change checks current password and revokes every session", async () => {
    users.findAuthById.mockResolvedValue(user);
    await service.changePassword(user.id, "old-password", "new-password");
    expect(bcrypt.compare).toHaveBeenCalledWith("old-password", "old-hash");
    expect(users.updatePassword).toHaveBeenCalledWith(client, user.id, "new-hash");
    expect(repository.revokeUserSessions).toHaveBeenCalledWith(client, user.id);
  });

  test("incorrect current password leaves credentials and sessions intact", async () => {
    users.findAuthById.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);
    await expect(service.changePassword(user.id, "wrong", "new-password")).rejects.toMatchObject({ statusCode: 401 });
    expect(users.updatePassword).not.toHaveBeenCalled();
    expect(repository.revokeUserSessions).not.toHaveBeenCalled();
  });
});
