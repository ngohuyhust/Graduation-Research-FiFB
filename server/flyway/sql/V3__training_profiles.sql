CREATE TABLE "${flyway:defaultSchema}".user_training_profiles (
  user_id uuid PRIMARY KEY REFERENCES "${flyway:defaultSchema}".app_users(id) ON DELETE CASCADE,
  goal text NOT NULL CHECK (goal IN ('general_fitness', 'build_muscle', 'lose_fat', 'strength')),
  experience_level text NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  days_per_week integer NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  session_minutes integer NOT NULL CHECK (session_minutes BETWEEN 15 AND 180),
  location text NOT NULL CHECK (location IN ('home', 'gym', 'both')),
  limitations text NOT NULL DEFAULT '' CHECK (length(limitations) <= 1000),
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "${flyway:defaultSchema}".user_available_equipments (
  user_id uuid REFERENCES "${flyway:defaultSchema}".user_training_profiles(user_id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES "${flyway:defaultSchema}".equipments(id),
  PRIMARY KEY (user_id, equipment_id)
);

CREATE TABLE "${flyway:defaultSchema}".user_priority_muscles (
  user_id uuid REFERENCES "${flyway:defaultSchema}".user_training_profiles(user_id) ON DELETE CASCADE,
  muscle_id uuid REFERENCES "${flyway:defaultSchema}".muscles(id),
  PRIMARY KEY (user_id, muscle_id)
);

CREATE TABLE "${flyway:defaultSchema}".user_exercise_preferences (
  user_id uuid REFERENCES "${flyway:defaultSchema}".user_training_profiles(user_id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES "${flyway:defaultSchema}".exercises(id) ON DELETE CASCADE,
  preference text NOT NULL CHECK (preference IN ('disliked', 'liked')),
  PRIMARY KEY (user_id, exercise_id)
);
