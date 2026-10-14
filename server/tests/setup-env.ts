// Set before imports/dotenv so developer services and credentials cannot affect unit tests.
process.env.NODE_ENV = "test";
process.env.REDIS_DISABLED = "true";
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/fifb_unit_tests";
process.env.JWT_ACCESS_SECRET = "test_access_secret_for_unit_tests_32_chars";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_for_unit_tests_32_chars";
process.env.CORS_ORIGIN = "http://localhost:5173,http://localhost:3000";
process.env.SENDGRID_API_KEY = "";
process.env.SENDGRID_FROM_EMAIL = "";
