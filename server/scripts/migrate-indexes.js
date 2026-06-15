const { pool } = require("../src/db/pool");

const sql = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_exercises_status ON public.exercises(status);
CREATE INDEX IF NOT EXISTS idx_exercises_name_trgm ON public.exercises USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON public.trainer_connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_trainer_connections_status ON public.user_trainer_connections(status);
CREATE INDEX IF NOT EXISTS idx_workout_plans_owner ON public.workout_plans(owner_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_exercises_user ON public.favorite_exercises(user_id);
`;

async function migrate() {
  if (process.argv.includes("--dry-run")) {
    console.log(sql.trim());
    return;
  }
  try {
    await pool.query(sql);
    console.log("Performance indexes applied");
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
