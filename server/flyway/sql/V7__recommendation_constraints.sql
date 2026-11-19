ALTER TABLE "${flyway:defaultSchema}".recommendation_exercises
  ADD CHECK (length(trim(replacement_group)) > 0);

CREATE FUNCTION "${flyway:defaultSchema}".valid_program(days integer, schedule jsonb, slots jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE day_slots jsonb;
BEGIN
  IF jsonb_array_length(schedule) <> days OR jsonb_array_length(slots) <> days
     OR EXISTS (SELECT FROM jsonb_array_elements(schedule) d WHERE d::text !~ '^[1-7]$')
     OR (SELECT count(DISTINCT d) FROM jsonb_array_elements(schedule) d) <> days THEN RETURN false; END IF;
  FOR day_slots IN SELECT value FROM jsonb_array_elements(slots) LOOP
    IF jsonb_typeof(day_slots) <> 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(day_slots) = 0 OR EXISTS (
      SELECT FROM jsonb_array_elements_text(day_slots) m
      WHERE m IS NULL OR m NOT IN ('squat','hinge','horizontal_push','vertical_push','horizontal_pull','vertical_pull','single_leg','core')
    ) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;

ALTER TABLE "${flyway:defaultSchema}".recommendation_templates
  ADD CHECK ("${flyway:defaultSchema}".valid_program(days_per_week,schedule,slots));

ALTER TABLE "${flyway:defaultSchema}".recommendation_runs
  ADD COLUMN decision text NOT NULL DEFAULT 'pending',
  ADD COLUMN kind text NOT NULL DEFAULT 'plan' CHECK (kind IN ('plan','substitution','progression')),
  DROP CONSTRAINT recommendation_runs_saved_plan_id_fkey,
  ADD FOREIGN KEY (saved_plan_id) REFERENCES "${flyway:defaultSchema}".workout_plans(id) ON DELETE CASCADE;
UPDATE "${flyway:defaultSchema}".recommendation_runs SET decision='accepted' WHERE saved_plan_id IS NOT NULL;
ALTER TABLE "${flyway:defaultSchema}".recommendation_runs
  ADD CHECK (decision IN ('pending','accepted','dismissed')),
  ADD CHECK ((saved_plan_id IS NOT NULL) = (kind='plan' AND decision='accepted')),
  ADD CHECK (length(trim(rule_version)) > 0 AND jsonb_typeof(input)='object' AND jsonb_typeof(result)='object');

-- A preference belongs to the account even when a legacy user logs a workout before onboarding.
ALTER TABLE "${flyway:defaultSchema}".user_exercise_preferences
  DROP CONSTRAINT user_exercise_preferences_user_id_fkey,
  ADD FOREIGN KEY (user_id) REFERENCES "${flyway:defaultSchema}".app_users(id) ON DELETE CASCADE;

ALTER TABLE "${flyway:defaultSchema}".workout_sessions ADD UNIQUE (id,user_id);
ALTER TABLE "${flyway:defaultSchema}".recommendation_feedback
  DROP CONSTRAINT recommendation_feedback_session_id_fkey,
  ADD FOREIGN KEY (session_id,user_id) REFERENCES "${flyway:defaultSchema}".workout_sessions(id,user_id) ON DELETE CASCADE;

ALTER TABLE "${flyway:defaultSchema}".workout_plans ADD UNIQUE (id,owner_id);
ALTER TABLE "${flyway:defaultSchema}".recommendation_runs
  DROP CONSTRAINT recommendation_runs_saved_plan_id_fkey,
  ADD FOREIGN KEY (saved_plan_id,user_id) REFERENCES "${flyway:defaultSchema}".workout_plans(id,owner_id) ON DELETE CASCADE;
