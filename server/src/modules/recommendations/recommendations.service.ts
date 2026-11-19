import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { isDeepStrictEqual } from "node:util";
import { DatabaseService, type QueryExecutor } from "../../db/database.service";
import { TrainingProfilesService } from "../trainingProfiles/trainingProfiles.service";
import { WorkoutPlansService } from "../workoutPlans/workoutPlans.service";
import { generatePlan, ruleVersion, type Candidate, type Profile, type Template } from "./recommendation.rules";

@Injectable()
export class RecommendationsService {
  constructor(
    readonly db: DatabaseService,
    private profiles: TrainingProfilesService,
    private plans: WorkoutPlansService,
  ) {}

  async inputs(db: QueryExecutor, user: string) {
    // Profile saves lock the same owner before replacing taxonomy and preference rows.
    await db.query("SELECT id FROM app_users WHERE id=$1 FOR SHARE", [user]);
    const profile = (await this.profiles.get(user, db)) as Profile | null;
    const candidates = (
      await db.query<Candidate>(
        `
      SELECT e.id,e.name,c.movement_pattern AS pattern,c.difficulty,c.exercise_type AS type,
        c.beginner_friendly AS "beginnerFriendly",c.estimated_minutes AS minutes,c.replacement_group AS "group",
        EXISTS(SELECT FROM exercise_equipments WHERE exercise_id=e.id) AS "equipmentKnown",
        ARRAY(SELECT eq.id FROM exercise_equipments x JOIN equipments eq ON eq.id=x.equipment_id
          WHERE x.exercise_id=e.id AND lower(eq.name) NOT IN ('body weight','bodyweight','body only') ORDER BY eq.id) AS "equipmentIds",
        ARRAY(SELECT muscle_id FROM exercise_muscles WHERE exercise_id=e.id AND muscle_role='target' ORDER BY muscle_id) AS "targetIds",
        p.preference,(SELECT difficulty FROM recommendation_feedback WHERE user_id=$1 AND exercise_id=e.id
          ORDER BY updated_at DESC,session_id LIMIT 1) AS rating,
        EXISTS(SELECT FROM session_exercise_logs l JOIN workout_sessions s ON s.id=l.session_id
          WHERE l.exercise_id=e.id AND l.deleted_at IS NULL AND s.user_id=$1 AND s.completed_at >= now()-interval '7 days') AS recent
      FROM recommendation_exercises c JOIN exercises e ON e.id=c.exercise_id
      LEFT JOIN user_exercise_preferences p ON p.exercise_id=e.id AND p.user_id=$1
      WHERE c.review_status='approved' AND e.status='active' ORDER BY e.id FOR SHARE OF c,e`,
        [user],
      )
    ).rows;
    return { profile, candidates };
  }

  private async program(db: QueryExecutor, user: string) {
    const { profile, candidates } = await this.inputs(db, user);
    const template =
      (
        await db.query<Template>(
          "SELECT id,title,schedule,slots FROM recommendation_templates WHERE approved AND days_per_week=$1 FOR SHARE",
          [profile?.daysPerWeek],
        )
      ).rows[0] ?? null;
    const result =
      profile && template
        ? generatePlan(profile, template, candidates)
        : { problem: profile ? "Choose 2, 3 or 4 training days per week." : "Complete your training profile first." };
    return { input: { profile, candidates, template }, result };
  }

  async saveRun(db: QueryExecutor, user: string, kind: string, input: unknown, result: unknown) {
    return (
      await db.query<{ id: string }>(
        "INSERT INTO recommendation_runs(user_id,kind,rule_version,input,result) VALUES($1,$2,$3,$4,$5) RETURNING id",
        [user, kind, ruleVersion, JSON.stringify(input), JSON.stringify(result)],
      )
    ).rows[0].id;
  }

  async run(db: QueryExecutor, user: string, id: string, kind?: string) {
    const row = (
      await db.query(
        "SELECT * FROM recommendation_runs WHERE user_id=$1 AND id=$2 AND ($3::text IS NULL OR kind=$3) FOR UPDATE",
        [user, id, kind ?? null],
      )
    ).rows[0];
    if (!row) throw new NotFoundException("Recommendation not found");
    return row;
  }

  async preview(user: string) {
    return this.db.withTransaction(async (db) => {
      const { input, result } = await this.program(db, user);
      const runId = await this.saveRun(db, user, "plan", input, result);
      return { runId, ...result };
    });
  }

  async dismiss(user: string, id: string) {
    return this.db.withTransaction(async (db) => {
      const run = await this.run(db, user, id);
      if (run.decision === "accepted") throw new ConflictException("Recommendation already accepted");
      await db.query("UPDATE recommendation_runs SET decision='dismissed' WHERE id=$1", [id]);
      return { decision: "dismissed" };
    });
  }

  async accept(user: string, id: string) {
    return this.db.withTransaction(async (db) => {
      const run = await this.run(db, user, id, "plan");
      if (run.decision === "accepted") return { planId: run.saved_plan_id };
      const { result } = await this.program(db, user);
      if (
        run.decision !== "pending" ||
        run.rule_version !== ruleVersion ||
        !("plan" in result) ||
        !result.plan ||
        !isDeepStrictEqual(result.plan, run.result.plan)
      )
        throw new ConflictException("Refresh your recommendation before saving.");
      const plan = await this.plans.createInTransaction(db, user, result.plan);
      await db.query("UPDATE recommendation_runs SET decision='accepted',saved_plan_id=$2 WHERE id=$1", [id, plan!.id]);
      return { planId: plan!.id };
    });
  }
}
