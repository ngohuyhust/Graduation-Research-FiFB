import { BadRequestException, Injectable } from "@nestjs/common";
import { DatabaseService, type QueryExecutor } from "../../db/database.service";
import type { TrainingProfile } from "./trainingProfiles.validation";

@Injectable()
export class TrainingProfilesService {
  constructor(private readonly db: DatabaseService) {}

  async get(userId: string, db: QueryExecutor = this.db) {
    const result = await db.query(
      `SELECT goal, experience_level AS "experienceLevel",
      days_per_week AS "daysPerWeek", session_minutes AS "sessionMinutes", location, limitations,
      completed_at AS "completedAt", updated_at AS "updatedAt",
      ARRAY(SELECT equipment_id FROM user_available_equipments WHERE user_id = p.user_id ORDER BY equipment_id) AS "equipmentIds",
      ARRAY(SELECT muscle_id FROM user_priority_muscles WHERE user_id = p.user_id ORDER BY muscle_id) AS "priorityMuscleIds",
      ARRAY(SELECT exercise_id FROM user_exercise_preferences WHERE user_id = p.user_id AND preference = 'disliked' ORDER BY exercise_id) AS "dislikedExerciseIds"
      FROM user_training_profiles p WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async save(userId: string, profile: TrainingProfile) {
    return this.db.withTransaction(async (db) => {
      // Serialize full replacements, including the first save for this account.
      await db.query("SELECT id FROM app_users WHERE id = $1 FOR UPDATE", [userId]);
      for (const [table, ids] of [
        ["equipments", profile.equipmentIds],
        ["muscles", profile.priorityMuscleIds],
        ["exercises", profile.dislikedExerciseIds],
      ] as const) {
        const result = await db.query(
          `SELECT id FROM ${table} WHERE id = ANY($1::uuid[])${table === "exercises" ? " AND status = 'active' AND deleted_at IS NULL" : ""} FOR KEY SHARE`,
          [ids],
        );
        if (result.rows.length !== ids.length) throw new BadRequestException(`Invalid ${table} selection`);
      }
      await db.query(
        `INSERT INTO user_training_profiles
        (user_id, goal, experience_level, days_per_week, session_minutes, location, limitations)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) DO UPDATE SET goal = EXCLUDED.goal, experience_level = EXCLUDED.experience_level,
        days_per_week = EXCLUDED.days_per_week, session_minutes = EXCLUDED.session_minutes,
        location = EXCLUDED.location, limitations = EXCLUDED.limitations, updated_at = now()`,
        [
          userId,
          profile.goal,
          profile.experienceLevel,
          profile.daysPerWeek,
          profile.sessionMinutes,
          profile.location,
          profile.limitations,
        ],
      );
      for (const [table, column, ids] of [
        ["user_available_equipments", "equipment_id", profile.equipmentIds],
        ["user_priority_muscles", "muscle_id", profile.priorityMuscleIds],
      ] as const) {
        await db.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        await db.query(`INSERT INTO ${table} (user_id, ${column}) SELECT $1, unnest($2::uuid[])`, [userId, ids]);
      }
      await db.query("DELETE FROM user_exercise_preferences WHERE user_id = $1 AND preference = 'disliked'", [userId]);
      await db.query(
        `INSERT INTO user_exercise_preferences (user_id, exercise_id, preference)
        SELECT $1, unnest($2::uuid[]), 'disliked'
        ON CONFLICT (user_id, exercise_id) DO UPDATE SET preference = 'disliked'`,
        [userId, profile.dislikedExerciseIds],
      );
      return this.get(userId, db);
    });
  }
}
