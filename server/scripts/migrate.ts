// Compatibility entry point; Flyway owns all schema migrations.
import { runFlyway } from "./flyway";

try {
  runFlyway();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Flyway failed.");
  process.exitCode = 1;
}
