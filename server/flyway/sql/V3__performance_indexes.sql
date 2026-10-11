-- Resolve the shared pg_trgm operator class without changing its schema.
DO $fifb$
DECLARE
  extension_schema text;
BEGIN
  SELECT n.nspname INTO extension_schema
  FROM pg_catalog.pg_extension e
  JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_trgm';

  IF extension_schema IS NULL THEN
    IF '${flyway:defaultSchema}' <> 'public' THEN
      RAISE EXCEPTION 'pg_trgm must already be installed before migrating test schema %', '${flyway:defaultSchema}';
    END IF;
    CREATE EXTENSION pg_trgm WITH SCHEMA public;
    extension_schema := 'public';
  END IF;

  PERFORM pg_catalog.set_config(
    'search_path',
    pg_catalog.format('%I,%I,pg_catalog', '${flyway:defaultSchema}', extension_schema),
    true
  );
END;
$fifb$;
CREATE INDEX IF NOT EXISTS idx_exercises_status ON "${flyway:defaultSchema}".exercises(status);
CREATE INDEX IF NOT EXISTS idx_exercises_name_trgm ON "${flyway:defaultSchema}".exercises USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON "${flyway:defaultSchema}".notifications(recipient_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON "${flyway:defaultSchema}".trainer_connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_trainer_connections_status ON "${flyway:defaultSchema}".user_trainer_connections(status);
CREATE INDEX IF NOT EXISTS idx_workout_plans_owner ON "${flyway:defaultSchema}".workout_plans(owner_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON "${flyway:defaultSchema}".audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_exercises_user ON "${flyway:defaultSchema}".favorite_exercises(user_id);
