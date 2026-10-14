-- Missing measurements remain unknown. Preserve all existing supplied values;
-- historic defaults cannot be distinguished reliably from user-entered values.
ALTER TABLE "${flyway:defaultSchema}".app_users
  ALTER COLUMN gender DROP DEFAULT,
  ALTER COLUMN gender DROP NOT NULL,
  ALTER COLUMN height DROP DEFAULT,
  ALTER COLUMN height DROP NOT NULL,
  ALTER COLUMN weight DROP DEFAULT,
  ALTER COLUMN weight DROP NOT NULL;
