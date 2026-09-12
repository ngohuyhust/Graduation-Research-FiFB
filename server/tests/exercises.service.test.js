// Kiem thu tu dong cho exercises service.
jest.mock("../src/db/pool", () => ({
  withTransaction: (callback) => callback({ query: jest.fn() }),
}));

jest.mock("../src/modules/exercises/exercises.repository", () => ({
  create: jest.fn(),
  replaceMappings: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  setReviewStatus: jest.fn(),
}));

jest.mock("../src/modules/audit/audit.repository", () => ({
  createAudit: jest.fn(),
}));

jest.mock("../src/modules/notifications/notifications.repository", () => ({
  createNotification: jest.fn(),
}));

const repository = require("../src/modules/exercises/exercises.repository");
const { ExercisesService } = require("../src/modules/exercises/exercises.service");
const service = new ExercisesService(repository);

describe("exercises service", () => {
  test("trainer submissions are created through the trainer_submission source", async () => {
    repository.create.mockResolvedValue({ id: "exercise-id", status: "pending" });

    await service.createExercise({ userId: "trainer-id", role: "trainer" }, { name: "Push up" }, "trainer_submission");

    expect(repository.create.mock.calls[0][3]).toBe("trainer_submission");
    expect(repository.replaceMappings).toHaveBeenCalledWith(expect.anything(), "exercise-id", { name: "Push up" });
  });

  test("review rejects active exercises as invalid state transition", async () => {
    repository.findById.mockResolvedValue({ id: "exercise-id", status: "active" });

    await expect(
      service.reviewExercise({ userId: "admin-id" }, "exercise-id", { status: "approved" }),
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
