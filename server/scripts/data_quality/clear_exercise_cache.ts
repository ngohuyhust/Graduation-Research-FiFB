// Clear exercise library cache after a direct database cleanup or rollback.
import { invalidateByPrefix } from "../../src/utils/cache";
import { closeRedis } from "../../src/redis/client";

invalidateByPrefix("exercises:")
  .then(() => console.log("Exercise cache cleared (or disabled)."))
  .catch(() => {
    console.error("Exercise cache invalidation failed; retry with the running API environment.");
    process.exitCode = 1;
  })
  .finally(() => closeRedis());
