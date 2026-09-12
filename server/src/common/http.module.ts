import { Module } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { ResponseCacheInterceptor } from "./response-cache.interceptor";

@Module({
  providers: [AuthGuard, ResponseCacheInterceptor],
  exports: [AuthGuard, ResponseCacheInterceptor],
})
export class HttpModule {}
