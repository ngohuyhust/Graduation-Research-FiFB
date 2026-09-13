jest.mock("pg", () => ({ Pool: jest.fn().mockImplementation(() => ({ connect: jest.fn() })) }));
jest.mock("../src/modules/audit/audit.repository", () => ({ createAudit: jest.fn() }));
jest.mock("../src/modules/notifications/notifications.repository", () => {
  const actual = jest.requireActual("../src/modules/notifications/notifications.repository");
  const createNotification = jest.fn();
  class NotificationsRepository extends actual.NotificationsRepository {
    createNotification(...args) { return createNotification(...args); }
  }
  return { ...actual, NotificationsRepository, createNotification };
});
const { pool } = require("../src/db/pool");
const { DatabaseService } = require("../src/db/database.service");
const { UsersService } = require("../src/modules/users/users.service");
const { createAudit } = require("../src/modules/audit/audit.repository");
const { createNotification } = require("../src/modules/notifications/notifications.repository");

describe("user status transaction boundary", () => {
  let client;
  let service;
  beforeEach(() => {
    jest.resetAllMocks();
    client = { query: jest.fn(), release: jest.fn() };
    pool.connect.mockResolvedValue(client);
    const repository = {
      setStatus: jest
        .fn()
        .mockResolvedValue({ oldUser: { id: "member", status: "active" }, user: { id: "member", status: "locked" } }),
    };
    service = new UsersService(new (require("../src/modules/notifications/notifications.repository").NotificationsRepository)({}), repository, new DatabaseService());
  });

  test("success commits only after audit and notification complete", async () => {
    await service.updateUserStatus({ userId: "admin" }, "member", "locked");
    expect(client.query.mock.calls).toEqual([["BEGIN"], ["COMMIT"]]);
    expect(client.query.mock.invocationCallOrder[1]).toBeGreaterThan(createAudit.mock.invocationCallOrder[0]);
    expect(client.query.mock.invocationCallOrder[1]).toBeGreaterThan(createNotification.mock.invocationCallOrder[0]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test.each(["audit", "notification"])("%s failure rolls back and releases the connection", async (target) => {
    const failure = new Error(`${target} unavailable`);
    (target === "audit" ? createAudit : createNotification).mockRejectedValue(failure);
    await expect(service.updateUserStatus({ userId: "admin" }, "member", "locked")).rejects.toBe(failure);
    expect(client.query.mock.calls).toEqual([["BEGIN"], ["ROLLBACK"]]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
