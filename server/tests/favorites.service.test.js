// Kiem thu tu dong cho favorites service.
jest.mock("../src/db/pool", () => ({
  withTransaction: (callback) => callback({ query: jest.fn() }),
}));

jest.mock("../src/modules/exercises/exercises.repository", () => {
  const actual = jest.requireActual("../src/modules/exercises/exercises.repository");
  const ensureActive = jest.fn();
  class ExercisesRepository extends actual.ExercisesRepository {
    ensureActive(...args) {
      return ensureActive(...args);
    }
  }
  return { ...actual, ExercisesRepository, ensureActive };
});

const repository = { add: jest.fn(), remove: jest.fn(), list: jest.fn() };
const exerciseRepository = require("../src/modules/exercises/exercises.repository");
const { FavoritesService } = require("../src/modules/favorites/favorites.service");
const { DatabaseService } = require("../src/db/database.service");
const service = new FavoritesService(
  new (require("../src/modules/exercises/exercises.repository").ExercisesRepository)({}),
  repository,
  new DatabaseService(),
);

describe("favorites service", () => {
  test("add favorite is idempotent when repository returns existing favorite", async () => {
    exerciseRepository.ensureActive.mockResolvedValue(true);
    repository.add.mockResolvedValue({
      user_id: "user-id",
      exercise_id: "exercise-id",
    });

    await expect(service.addFavorite("user-id", "exercise-id")).resolves.toEqual({
      favorite: {
        user_id: "user-id",
        exercise_id: "exercise-id",
      },
    });
  });
});
