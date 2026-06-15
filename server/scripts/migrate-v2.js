const { pool } = require("../src/db/pool");

const sql = `
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_plan_id uuid,
  title text NOT NULL,
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT workout_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id),
  CONSTRAINT workout_sessions_plan_id_fkey FOREIGN KEY (workout_plan_id) REFERENCES public.workout_plans(id)
);

CREATE TABLE IF NOT EXISTS public.session_exercise_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  set_number int NOT NULL DEFAULT 1 CHECK (set_number > 0),
  actual_reps int CHECK (actual_reps IS NULL OR actual_reps > 0),
  actual_weight_kg numeric(8,2) CHECK (actual_weight_kg IS NULL OR actual_weight_kg >= 0),
  duration_seconds int CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_exercise_logs_pkey PRIMARY KEY (id),
  CONSTRAINT session_exercise_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  CONSTRAINT session_exercise_logs_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.user_trainer_connections(id),
  CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started ON public.workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_exercise_logs_session_id ON public.session_exercise_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_exercise_logs_exercise_id ON public.session_exercise_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_connection_created ON public.chat_messages(connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages(connection_id, sender_id) WHERE read_at IS NULL;
`;

async function migrate() {
  if (process.argv.includes("--dry-run")) {
    console.log(sql.trim());
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("V2 schema migration applied");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
