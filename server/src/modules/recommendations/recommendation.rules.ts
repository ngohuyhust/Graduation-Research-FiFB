import type { TrainingProfile } from "../trainingProfiles/trainingProfiles.validation";
import type { WorkoutItem, WorkoutPlanPayload } from "../workoutPlans/workoutPlans.validation";

export const ruleVersion = "1.0.0";
export const movementPatterns = [
  "squat",
  "hinge",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "single_leg",
  "core",
] as const;

export type Movement = (typeof movementPatterns)[number];
export type Candidate = {
  id: string;
  name: string;
  pattern: Movement;
  difficulty: number;
  type: "strength" | "timed";
  beginnerFriendly: boolean;
  minutes: number;
  group: string;
  equipmentIds: string[];
  equipmentKnown: boolean;
  targetIds: string[];
  preference: "liked" | "disliked" | null;
  rating: "easy" | "right" | "hard" | null;
  recent: boolean;
};

export type Profile = TrainingProfile;

export type Template = {
  id: string;
  title: string;
  schedule: number[];
  slots: Movement[][];
};

export type Selection = {
  exerciseId: string;
  name: string;
  dayNumber: number;
  minutes: number;
  reason: string;
};

export function rankCandidates(profile: Profile, candidates: Candidate[]) {
  const maxDifficulty = { beginner: 1, intermediate: 2, advanced: 3 }[profile.experienceLevel];
  const equipment = new Set(profile.equipmentIds);
  const excluded = new Set(profile.dislikedExerciseIds);
  const priority = new Set(profile.priorityMuscleIds);
  return candidates
    .map((candidate) => {
      const exclusion =
        !candidate.equipmentKnown || candidate.equipmentIds.some((id) => !equipment.has(id))
          ? "Required equipment is unavailable"
          : excluded.has(candidate.id) || candidate.preference === "disliked"
            ? "Excluded from the training profile"
            : candidate.difficulty > maxDifficulty ||
                (profile.experienceLevel === "beginner" && !candidate.beginnerFriendly)
              ? "Above the profile's experience level"
              : null;
      const goalMatch =
        profile.goal === "lose_fat"
          ? candidate.type === "timed"
          : ["strength", "build_muscle"].includes(profile.goal) && candidate.type === "strength";
      const priorityMatch = candidate.targetIds.some((id) => priority.has(id));
      const score =
        (goalMatch ? 2 : 0) +
        (priorityMatch ? 3 : 0) +
        (candidate.preference === "liked" ? 4 : 0) +
        (candidate.rating === "hard" ? -3 : 0) +
        (candidate.recent ? -1 : 0);
      const reasons = [
        "Matches the movement, equipment and experience requirements",
        ...(goalMatch ? ["fits your training goal"] : []),
        ...(priorityMatch ? ["targets a priority muscle"] : []),
        ...(candidate.preference === "liked" ? ["matches a saved preference"] : []),
      ];
      return { candidate, exclusion, score, reason: reasons.join(", ") };
    })
    .sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id));
}

export function generatePlan(profile: Profile, template: Template, candidates: Candidate[]) {
  const ranked = rankCandidates(profile, candidates);
  const exclusions = ranked.flatMap(({ candidate, exclusion }) =>
    exclusion ? [{ exerciseId: candidate.id, reason: exclusion }] : [],
  );
  const selections: Selection[] = [];
  const items: WorkoutItem[] = [];
  for (const [index, slots] of template.slots.entries()) {
    const dayNumber = index + 1;
    const options = slots.map((pattern) =>
      ranked.filter((entry) => entry.candidate.pattern === pattern && !entry.exclusion),
    );
    const minimum = options.map((entries) => Math.min(...entries.map((entry) => entry.candidate.minutes)));
    const missing = options.findIndex((entries) => entries.length === 0);
    if (missing >= 0) {
      return {
        problem: `Day ${dayNumber} has no eligible ${slots[missing].replaceAll("_", " ")} exercise.`,
        exclusions,
      };
    }
    if (minimum.reduce((sum, value) => sum + value, 0) > profile.sessionMinutes) {
      return { problem: `Day ${dayNumber} needs more than ${profile.sessionMinutes} minutes.`, exclusions };
    }
    let available = profile.sessionMinutes;
    for (const [slot, entries] of options.entries()) {
      const reserve = minimum.slice(slot + 1).reduce((sum, value) => sum + value, 0);
      const chosen = entries.find((entry) => entry.candidate.minutes + reserve <= available)!;
      const { candidate } = chosen;
      available -= candidate.minutes;
      selections.push({
        exerciseId: candidate.id,
        name: candidate.name,
        dayNumber,
        minutes: candidate.minutes,
        reason: chosen.reason,
      });
      items.push({
        exerciseId: candidate.id,
        dayNumber,
        sortOrder: slot + 1,
        sets: 2,
        ...(candidate.type === "timed" ? { durationSeconds: 30 } : { reps: 8 }),
        restSeconds: 60,
      });
    }
  }
  const plan: WorkoutPlanPayload = {
    title: template.title,
    description: "Generated from your training profile.",
    visibility: "private",
    items,
    schedule: template.schedule.map((weekday, index) => ({ weekday, dayNumber: index + 1 })),
  };
  return { plan, selections, exclusions };
}

export function progressionAdvice(
  sessions: readonly { reps: readonly number[]; weights: readonly number[] }[],
  rating: "easy" | "right" | "hard" | null,
) {
  const latest = sessions[0];
  if (!latest?.reps.length) return null;
  if (rating === "hard" || latest.reps.some((reps) => reps < 8)) {
    return { action: "hold_or_reduce", reason: "Keep the load or reduce it slightly and aim for at least 8 reps." };
  }
  const previous = sessions[1];
  if (
    latest.weights.length === 1 &&
    latest.weights[0] > 0 &&
    latest.reps.every((reps) => reps >= 12) &&
    (rating === "easy" ||
      (previous?.weights.length === 1 &&
        previous.reps.length > 0 &&
        latest.weights[0] === previous.weights[0] &&
        previous.reps.every((reps) => reps >= 12)))
  ) {
    return {
      action: "increase_load",
      reason: "Your completed sets reached 12 reps. Try a 2.5% load increase and restart at 8 reps.",
    };
  }
  return { action: "increase_reps", reason: "Keep the current load and build toward 12 reps on each set." };
}
