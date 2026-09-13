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
const { TrainerCertificatesService } = require("../src/modules/trainerCertificates/trainerCertificates.service");
const { TrainerConnectionsService } = require("../src/modules/trainerConnections/trainerConnections.service");
const { createAudit } = require("../src/modules/audit/audit.repository");
const { createNotification } = require("../src/modules/notifications/notifications.repository");

describe("trainer transaction boundaries", () => {
  let client, certificateService, connectionService;
  beforeEach(() => {
    jest.resetAllMocks();
    client = { query: jest.fn(), release: jest.fn() };
    pool.connect.mockResolvedValue(client);
    const database = new DatabaseService();
    certificateService = new TrainerCertificatesService(new (require("../src/modules/notifications/notifications.repository").NotificationsRepository)({}),
      {
        findById: jest.fn().mockResolvedValue({ id: "certificate", trainer_id: "trainer", status: "pending" }),
        setReviewStatus: jest.fn().mockResolvedValue({ id: "certificate", status: "approved" }),
      },
      database,
      { findProfileForUpdate: jest.fn(), markVerified: jest.fn() },
    );
    connectionService = new TrainerConnectionsService(new (require("../src/modules/notifications/notifications.repository").NotificationsRepository)({}),
      {
        findPendingForTrainer: jest.fn().mockResolvedValue({ id: "request", trainer_id: "trainer", user_id: "member" }),
        findActiveConnection: jest.fn().mockResolvedValue(null),
        setDecision: jest.fn().mockResolvedValue({ id: "request", status: "approved" }),
        createConnection: jest.fn(),
      },
      database,
    );
  });

  test.each(["certificate", "connection"])("%s approval commits after notification", async (kind) => {
    if (kind === "certificate")
      await certificateService.review({ userId: "admin" }, "certificate", { status: "approved" });
    else await connectionService.decide({ userId: "trainer" }, "request", "approved");
    expect(client.query.mock.calls).toEqual([["BEGIN"], ["COMMIT"]]);
    expect(client.query.mock.invocationCallOrder[1]).toBeGreaterThan(createNotification.mock.invocationCallOrder[0]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test.each(["certificate", "connection"])("%s notification failure rolls back", async (kind) => {
    const failure = new Error("Notification failed");
    createNotification.mockRejectedValue(failure);
    const promise =
      kind === "certificate"
        ? certificateService.review({ userId: "admin" }, "certificate", { status: "approved" })
        : connectionService.decide({ userId: "trainer" }, "request", "approved");
    await expect(promise).rejects.toBe(failure);
    expect(client.query.mock.calls).toEqual([["BEGIN"], ["ROLLBACK"]]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test("certificate audit failure rolls back profile verification and review", async () => {
    createAudit.mockRejectedValue(new Error("Audit failed"));
    await expect(certificateService.review({ userId: "admin" }, "certificate", { status: "approved" })).rejects.toThrow(
      "Audit failed",
    );
    expect(client.query.mock.calls).toEqual([["BEGIN"], ["ROLLBACK"]]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
