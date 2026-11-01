ALTER TABLE "${flyway:defaultSchema}".workout_sessions
  ADD COLUMN client_operation_id uuid,
  ADD COLUMN creation_request jsonb,
  ADD COLUMN planned_snapshot jsonb,
  ADD COLUMN paused boolean NOT NULL DEFAULT false,
  ADD COLUMN rest_ends_at timestamptz,
  ADD CONSTRAINT workout_sessions_operation_unique UNIQUE (user_id, client_operation_id);

-- Historical sessions lack a selected day. Freeze the current full plan once;
-- already-lost historical plan versions cannot be reconstructed.
UPDATE "${flyway:defaultSchema}".workout_sessions s
SET planned_snapshot = COALESCE((
  SELECT jsonb_agg(to_jsonb(i) || jsonb_build_object('exercise_name', e.name, 'exercise_status', e.status)
    ORDER BY i.day_number, i.sort_order)
  FROM "${flyway:defaultSchema}".workout_plan_items i
  JOIN "${flyway:defaultSchema}".exercises e ON e.id = i.exercise_id
  WHERE i.workout_plan_id = s.workout_plan_id
), '[]'::jsonb);

ALTER TABLE "${flyway:defaultSchema}".session_exercise_logs
  ADD COLUMN client_operation_id uuid,
  ADD COLUMN creation_request jsonb,
  ADD COLUMN deleted_at timestamptz,
  ADD CONSTRAINT session_logs_operation_unique UNIQUE (session_id, client_operation_id);
