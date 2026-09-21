// Kiem thu tu dong cho exercises service.
jest.mock("../src/db/pool", () => ({
  withTransaction: (callback) => callback({ query: jest.fn() }),
}));

jest.mock("../src/modules/exercises/exercises.repository", () => {
  const actual = jest.requireActual("../src/modules/exercises/exercises.repository");
  const create = jest.fn(),
    replaceMappings = jest.fn(),
    findById = jest.fn(),
    update = jest.fn(),
    setReviewStatus = jest.fn();
  class ExercisesRepository extends actual.ExercisesRepository {
    create(...args) {
      return create(...args);
    }
    replaceMappings(...args) {
      return replaceMappings(...args);
    }
    findById(...args) {
      return findById(...args);
    }
    update(...args) {
      return update(...args);
    }
    setReviewStatus(...args) {
      return setReviewStatus(...args);
    }
  }
  return { ...actual, ExercisesRepository, create, replaceMappings, findById, update, setReviewStatus };
});

jest.mock("../src/modules/audit/audit.repository", () => {
  const actual = jest.requireActual("../src/modules/audit/audit.repository");
  const createAudit = jest.fn();
  class AuditRepository extends actual.AuditRepository {
    createAudit(...args) {
      return createAudit(...args);
    }
  }
  return { ...actual, AuditRepository, createAudit };
});

jest.mock("../src/modules/notifications/notifications.repository", () => {
  const actual = jest.requireActual("../src/modules/notifications/notifications.repository");
  const createNotification = jest.fn();
  class NotificationsRepository extends actual.NotificationsRepository {
    createNotification(...args) {
      return createNotification(...args);
    }
  }
  return { ...actual, NotificationsRepository, createNotification };
});

const repository = require("../src/modules/exercises/exercises.repository");
const { ExercisesService } = require("../src/modules/exercises/exercises.service");
const service = new ExercisesService(
  new (require("../src/db/database.service").DatabaseService)(),
  new (require("../src/modules/audit/audit.repository").AuditRepository)({}),
  new (require("../src/modules/notifications/notifications.repository").NotificationsRepository)({}),
  repository,
);

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

export {};
