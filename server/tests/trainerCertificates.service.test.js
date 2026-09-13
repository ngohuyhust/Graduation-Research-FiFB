// Kiem thu tu dong cho trainer certificates service.
jest.mock("../src/db/pool", () => ({
  withTransaction: (callback) => callback({ query: jest.fn() }),
}));

jest.mock("../src/modules/audit/audit.repository", () => ({
  createAudit: jest.fn(),
}));

jest.mock("../src/modules/notifications/notifications.repository", () => {
  const actual = jest.requireActual("../src/modules/notifications/notifications.repository");
  const createNotification = jest.fn();
  class NotificationsRepository extends actual.NotificationsRepository {
    createNotification(...args) { return createNotification(...args); }
  }
  return { ...actual, NotificationsRepository, createNotification };
});

const repository = { findById: jest.fn() };
const { TrainerCertificatesService } = require("../src/modules/trainerCertificates/trainerCertificates.service");
const { DatabaseService } = require("../src/db/database.service");
const service = new TrainerCertificatesService(new (require("../src/modules/notifications/notifications.repository").NotificationsRepository)({}), repository, new DatabaseService(), {});

describe("trainer certificates service", () => {
  test("certificate review is pending-only", async () => {
    repository.findById.mockResolvedValue({ id: "certificate-id", status: "approved" });

    await expect(
      service.review({ userId: "admin-id" }, "certificate-id", { status: "approved" }),
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
