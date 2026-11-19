CREATE TABLE "${flyway:defaultSchema}".recommendation_exercises (
  exercise_id uuid PRIMARY KEY REFERENCES "${flyway:defaultSchema}".exercises(id),
  movement_pattern text NOT NULL CHECK (movement_pattern IN (
    'squat', 'hinge', 'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'single_leg', 'core'
  )),
  difficulty int NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  exercise_type text NOT NULL CHECK (exercise_type IN ('strength', 'timed')),
  beginner_friendly boolean NOT NULL,
  estimated_minutes int NOT NULL CHECK (estimated_minutes BETWEEN 1 AND 30),
  replacement_group text NOT NULL,
  classification_confidence text NOT NULL CHECK (classification_confidence IN ('low', 'medium', 'high')),
  review_status text NOT NULL CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES "${flyway:defaultSchema}".app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "${flyway:defaultSchema}".recommendation_templates (
  id text PRIMARY KEY,
  title text NOT NULL,
  days_per_week int NOT NULL UNIQUE CHECK (days_per_week BETWEEN 2 AND 4),
  schedule jsonb NOT NULL CHECK (jsonb_typeof(schedule) = 'array'),
  slots jsonb NOT NULL CHECK (jsonb_typeof(slots) = 'array'),
  approved boolean NOT NULL DEFAULT false,
  reviewed_by uuid REFERENCES "${flyway:defaultSchema}".app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "${flyway:defaultSchema}".recommendation_templates
  (id, title, days_per_week, schedule, slots, approved)
VALUES
  ('full-body-2', 'Full Body · 2 days', 2, '[1,4]',
   '[["squat","horizontal_push","vertical_pull","hinge","horizontal_pull","core"],
     ["single_leg","vertical_push","horizontal_pull","hinge","horizontal_push","core"]]', true),
  ('full-body-3', 'Full Body · 3 days', 3, '[1,3,5]',
   '[["squat","horizontal_push","vertical_pull","hinge","horizontal_pull","core"],
     ["single_leg","vertical_push","horizontal_pull","hinge","horizontal_push","core"],
     ["squat","horizontal_push","vertical_pull","hinge","vertical_push","core"]]', true),
  ('upper-lower-4', 'Upper / Lower · 4 days', 4, '[1,2,4,5]',
   '[["horizontal_push","horizontal_pull","vertical_push","vertical_pull"],
     ["squat","hinge","single_leg","core"],
     ["vertical_push","vertical_pull","horizontal_push","horizontal_pull"],
     ["hinge","squat","single_leg","core"]]', true);

CREATE TABLE "${flyway:defaultSchema}".recommendation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "${flyway:defaultSchema}".app_users(id) ON DELETE CASCADE,
  rule_version text NOT NULL,
  input jsonb NOT NULL,
  result jsonb NOT NULL,
  saved_plan_id uuid REFERENCES "${flyway:defaultSchema}".workout_plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "${flyway:defaultSchema}".recommendation_feedback (
  user_id uuid NOT NULL REFERENCES "${flyway:defaultSchema}".app_users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES "${flyway:defaultSchema}".workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES "${flyway:defaultSchema}".exercises(id),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'right', 'hard')),
  preference text CHECK (preference IN ('liked', 'disliked')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, exercise_id)
);

CREATE INDEX recommendation_feedback_user_exercise_idx
  ON "${flyway:defaultSchema}".recommendation_feedback(user_id, exercise_id, updated_at DESC);
