import { Module } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { ResponseCacheInterceptor } from "./response-cache.interceptor";
import { UsersPersistenceModule } from "../modules/users/users-persistence.module";

@Module({
  imports: [UsersPersistenceModule],
  providers: [AuthGuard, ResponseCacheInterceptor],
  exports: [AuthGuard, ResponseCacheInterceptor, UsersPersistenceModule],
})
export class HttpModule {}
