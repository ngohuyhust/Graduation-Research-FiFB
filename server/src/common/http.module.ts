import { AuthTokensModule } from "../modules/auth/auth-tokens.module";
import { Module } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { ResponseCacheInterceptor } from "./response-cache.interceptor";
import { UsersPersistenceModule } from "../modules/users/users-persistence.module";

@Module({
  imports: [AuthTokensModule, UsersPersistenceModule],
  providers: [AuthGuard, ResponseCacheInterceptor],
  exports: [AuthTokensModule, AuthGuard, ResponseCacheInterceptor, UsersPersistenceModule],
})
export class HttpModule {}
