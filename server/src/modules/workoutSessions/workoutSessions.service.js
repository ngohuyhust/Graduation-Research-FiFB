const { AppError } = require("../../utils/errors/AppError");
const codes = require("../../utils/errors/errorCodes");
const { paginate } = require("../../utils/responses");
const { getRedisClient } = require("../../redis/client");
const repository = require("./workoutSessions.repository");

function streaks(rows) {
  const days = rows.map((row) => new Date(row.workout_date).toISOString().slice(0, 10));
  if (!days.length) return { currentStreak: 0, longestStreak: 0 };
  const unique = [...new Set(days)].map((day) => new Date(`${day}T00:00:00Z`)).sort((a, b) => b - a);
  let longest = 1;
  let run = 1;
  for (let index = 1; index < unique.length; index += 1) {
    const diffDays = Math.round((unique[index - 1] - unique[index]) / 86400000);
    if (diffDays === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const newestGap = Math.round((today - unique[0]) / 86400000);
  let current = newestGap <= 1 ? 1 : 0;
  if (current) {
    for (let index = 1; index < unique.length; index += 1) {
      if (Math.round((unique[index - 1] - unique[index]) / 86400000) !== 1) break;
      current += 1;
    }
  }
  return { currentStreak: current, longestStreak: longest };
}

async function invalidateStats(userId) {
  const redis = await getRedisClient();
  if (redis) await redis.del(`stats:${userId}`);
}

async function create(userId, payload) {
  if (payload.workoutPlanId && !(await repository.findOwnedPlan(userId, payload.workoutPlanId))) {
    throw new AppError(codes.NOT_FOUND, "Workout plan not found", 404);
  }
  const session = await repository.create(userId, payload);
  await invalidateStats(userId);
  return { session };
}

async function list(userId, filters) {
  const result = await repository.list(userId, filters);
  return paginate({ items: result.rows, page: filters.page, limit: filters.limit, total: result.total });
}

async function detail(userId, id) {
  const session = await repository.detail(userId, id);
  if (!session) throw new AppError(codes.NOT_FOUND, "Workout session not found", 404);
  return { session };
}

async function update(userId, id, payload) {
  const session = await repository.update(userId, id, payload);
  if (!session) throw new AppError(codes.NOT_FOUND, "Workout session not found", 404);
  await invalidateStats(userId);
  return { session };
}

async function addLog(userId, sessionId, payload) {
  if (!(await repository.ensureActiveExercise(payload.exerciseId))) {
    throw new AppError(codes.BAD_REQUEST, "Exercise must be active", 400);
  }
  const log = await repository.addLog(userId, sessionId, payload);
  if (!log) throw new AppError(codes.NOT_FOUND, "Active workout session not found", 404);
  await invalidateStats(userId);
  return { log };
}

async function stats(userId) {
  const redis = await getRedisClient();
  const key = `stats:${userId}`;
  const cached = redis ? await redis.get(key) : null;
  if (cached) return typeof cached === "string" ? JSON.parse(cached) : cached;
  const result = await repository.stats(userId);
  const streak = streaks(result.dates);
  const data = {
    totalSessions: result.summary.total_sessions,
    thisWeekSessions: result.summary.this_week_sessions,
    totalVolumeKg: result.summary.total_volume_kg,
    ...streak,
    weeklyVolume: result.weekly,
    topExercises: result.topExercises,
  };
  if (redis) await redis.set(key, JSON.stringify(data), { EX: 1800 });
  return data;
}

async function progression(userId, exerciseId) {
  const result = await repository.progression(userId, exerciseId);
  if (!result) throw new AppError(codes.NOT_FOUND, "Exercise not found", 404);
  return {
    exerciseId: result.exercise.id,
    exerciseName: result.exercise.name,
    progression: result.progression,
    personalRecord: result.personalRecord,
  };
}

module.exports = { create, list, detail, update, addLog, stats, progression, streaks };
