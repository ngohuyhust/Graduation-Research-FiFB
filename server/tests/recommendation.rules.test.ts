import { progressionAdvice, rankCandidates, type Candidate } from "../src/modules/recommendations/recommendation.rules";
import type { TrainingProfile } from "../src/modules/trainingProfiles/trainingProfiles.validation";

const profile: TrainingProfile = {
  goal: "strength",
  experienceLevel: "beginner",
  daysPerWeek: 2,
  sessionMinutes: 30,
  location: "home",
  limitations: "",
  equipmentIds: ["mat"],
  dislikedExerciseIds: ["excluded"],
  priorityMuscleIds: ["quads"],
};

function candidate(id: string, overrides: Partial<Candidate> = {}): Candidate {
  return {
    id,
    name: id,
    pattern: "squat",
    difficulty: 1,
    type: "strength",
    beginnerFriendly: true,
    minutes: 5,
    group: "squat",
    equipmentIds: [],
    equipmentKnown: true,
    targetIds: [],
    preference: null,
    rating: null,
    recent: false,
    ...overrides,
  };
}

describe("recommendation candidate ranking", () => {
  it("enforces all profile constraints even for preferred or highly ranked exercises", () => {
    const entries = [
      candidate("excluded", { preference: "liked" }),
      candidate("disliked", { preference: "disliked" }),
      candidate("unknown", { equipmentKnown: false }),
      candidate("missing", { equipmentIds: ["mat", "rack"] }),
      candidate("advanced", { difficulty: 2 }),
      candidate("unsuitable", { beginnerFriendly: false }),
      candidate("eligible", { equipmentIds: ["mat"] }),
    ];
    const ranked = rankCandidates(profile, entries);
    expect(ranked.filter(({ exclusion }) => !exclusion).map(({ candidate }) => candidate.id)).toEqual(["eligible"]);
    expect(ranked.filter(({ exclusion }) => exclusion).every(({ exclusion }) => Boolean(exclusion?.trim()))).toBe(true);
  });

  it("ranks by profile and history, resolving equal scores consistently across input orders", () => {
    const entries = [
      candidate("b"),
      candidate("liked", { preference: "liked" }),
      candidate("priority", { targetIds: ["quads"] }),
      candidate("a"),
      candidate("recent", { recent: true }),
      candidate("timed", { type: "timed" }),
      candidate("hard", { rating: "hard" }),
    ];
    for (const input of [entries, [...entries].reverse()]) {
      expect(rankCandidates(profile, input).map(({ candidate }) => candidate.id)).toEqual([
        "liked",
        "priority",
        "a",
        "b",
        "recent",
        "timed",
        "hard",
      ]);
    }
  });
});

describe("double progression", () => {
  const workout = (reps: number[], weight: number) => ({ reps, weights: [weight] });
  it.each([
    [[workout([7, 10], 20)], null, "hold_or_reduce"],
    [[workout([9, 11], 20)], null, "increase_reps"],
    [[workout([12, 12], 20), workout([12, 12], 20)], "right", "increase_load"],
    [[workout([12, 12], 20), workout([10, 12], 20)], null, "increase_reps"],
    [[workout([12, 12], 20), workout([12, 12], 25)], null, "increase_reps"],
    [[workout([12], 20)], "hard", "hold_or_reduce"],
    [[workout([12], 20)], "easy", "increase_load"],
    [[workout([12], 0)], "easy", "increase_reps"],
    [[{ reps: [12, 12], weights: [20, 25] }], "easy", "increase_reps"],
  ] as const)("evaluates recorded sets and the latest rating (%#)", (history, rating, action) => {
    expect(progressionAdvice([...history], rating)).toMatchObject({ action, reason: expect.any(String) });
  });
  it("requires observed repetitions", () => {
    expect(progressionAdvice([], null)).toBeNull();
    expect(progressionAdvice([workout([], 20)], "easy")).toBeNull();
  });
});
