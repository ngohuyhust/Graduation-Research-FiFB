jest.mock("../src/db/pool", () => ({
  withTransaction: (callback) => callback({ query: jest.fn() }),
}));

jest.mock("../src/modules/favorites/favorites.repository", () => ({
  add: jest.fn(),
  remove: jest.fn(),
  list: jest.fn(),
}));

jest.mock("../src/modules/exercises/exercises.repository", () => ({
  ensureActive: jest.fn(),
}));

const repository = require("../src/modules/favorites/favorites.repository");
const exerciseRepository = require("../src/modules/exercises/exercises.repository");
const service = require("../src/modules/favorites/favorites.service");

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
