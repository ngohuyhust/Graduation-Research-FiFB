ALTER TABLE "${flyway:defaultSchema}".workout_plans
  ADD COLUMN schedule jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(schedule) = 'array' AND jsonb_array_length(schedule) <= 7);
