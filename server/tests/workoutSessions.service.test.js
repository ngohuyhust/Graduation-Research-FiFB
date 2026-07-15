// Kiem thu tu dong cho workout sessions service.
jest.mock("../src/modules/workoutSessions/workoutSessions.repository", () => ({
  findOwnedPlan: jest.fn(),
  create: jest.fn(),
  list: jest.fn(),
  detail: jest.fn(),
  update: jest.fn(),
  ensureActiveExercise: jest.fn(),
  addLog: jest.fn(),
  stats: jest.fn(),
  progression: jest.fn(),
}));

jest.mock("../src/redis/client", () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
}));

const repository = require("../src/modules/workoutSessions/workoutSessions.repository");
const service = require("../src/modules/workoutSessions/workoutSessions.service");

describe("workout sessions service", () => {
  beforeEach(() => jest.clearAllMocks());

  test("creates a session linked to an owned plan", async () => {
    repository.findOwnedPlan.mockResolvedValue({ id: "plan-id" });
    repository.create.mockResolvedValue({ id: "session-id" });
    await expect(service.create("user-id", { workoutPlanId: "plan-id", title: "Push day" })).resolves.toEqual({
      session: { id: "session-id" },
    });
  });

  test("calculates consecutive workout streaks", () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);
    const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);
    expect(
      service.streaks([{ workout_date: today }, { workout_date: yesterday }, { workout_date: twoDaysAgo }]),
    ).toEqual({ currentStreak: 3, longestStreak: 3 });
  });
});
