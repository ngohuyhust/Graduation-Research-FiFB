jest.mock("socket.io", () => ({
  Server: jest.fn().mockImplementation(() => ({ use: jest.fn(), on: jest.fn(), close: jest.fn() })),
}));
const { initializeSocket, closeSocket } = require("../src/socket");
const { signAccessToken } = new (require("../src/modules/auth/jwt.service").JwtService)();
const { env } = require("../src/config/env");

describe("Socket auth uses the injected users repository", () => {
  let repository;
  let authenticate;
  let previousEnabled;
  const user = { id: "user-id", role: "trainer", status: "active", email_verified_at: "2026-01-01" };
  beforeEach(() => {
    previousEnabled = env.socketIoEnabled;
    env.socketIoEnabled = true;
    repository = { findById: jest.fn().mockResolvedValue(user) };
    const io = initializeSocket({}, repository, {}, new (require("../src/modules/auth/jwt.service").JwtService)());
    authenticate = io.use.mock.calls[0][0];
  });
  afterEach(async () => {
    await closeSocket();
    env.socketIoEnabled = previousEnabled;
  });

  test("JWT subject is looked up through the provided instance", async () => {
    const socket = { handshake: { auth: { token: signAccessToken(user) } } };
    const next = jest.fn();
    await authenticate(socket, next);
    expect(repository.findById).toHaveBeenCalledWith(user.id);
    expect((socket as { user?: unknown }).user).toEqual({ id: user.id, role: user.role, status: user.status });
    expect(next).toHaveBeenCalledWith();
  });

  test.each([null, { ...user, status: "locked" }, { ...user, email_verified_at: null }])(
    "rejects unavailable/inactive/unverified users %#",
    async (record) => {
      repository.findById.mockResolvedValue(record);
      const next = jest.fn();
      await authenticate({ handshake: { auth: { token: signAccessToken(user) } } }, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    },
  );
});

export {};
