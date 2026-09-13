// Kiem thu tu dong cho trainer certificates service.
jest.mock("../src/db/pool", () => ({
  withTransaction: (callback) => callback({ query: jest.fn() }),
}));

jest.mock("../src/modules/audit/audit.repository", () => ({
  createAudit: jest.fn(),
}));

jest.mock("../src/modules/notifications/notifications.repository", () => ({
  createNotification: jest.fn(),
}));

const repository = { findById: jest.fn() };
const { TrainerCertificatesService } = require("../src/modules/trainerCertificates/trainerCertificates.service");
const { DatabaseService } = require("../src/db/database.service");
const service = new TrainerCertificatesService(repository, new DatabaseService(), {});

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
