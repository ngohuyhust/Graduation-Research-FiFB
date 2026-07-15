// Kiem thu tu dong cho trainer certificates service.
jest.mock("../src/db/pool", () => ({
  withTransaction: (callback) => callback({ query: jest.fn() }),
}));

jest.mock("../src/modules/trainerCertificates/trainerCertificates.repository", () => ({
  ensureTrainerProfile: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  setReviewStatus: jest.fn(),
}));

jest.mock("../src/modules/trainers/trainers.repository", () => ({
  findProfileForUpdate: jest.fn(),
  markVerified: jest.fn(),
}));

jest.mock("../src/modules/audit/audit.repository", () => ({
  createAudit: jest.fn(),
}));

jest.mock("../src/modules/notifications/notifications.repository", () => ({
  createNotification: jest.fn(),
}));

const repository = require("../src/modules/trainerCertificates/trainerCertificates.repository");
const service = require("../src/modules/trainerCertificates/trainerCertificates.service");

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
