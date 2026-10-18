import { EmailDeliveriesModule } from "../emailDeliveries/emailDeliveries.module";
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import type { RouteInfo } from "@nestjs/common/interfaces";
import { HttpModule } from "../../common/http.module";
import { AuthController } from "./auth.controller";
import { MobileAuthController } from "./mobile-auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { DatabaseModule } from "../../db/database.module";
import { AuthTokensModule } from "./auth-tokens.module";
import { UsersPersistenceModule } from "../users/users-persistence.module";
const { authRateLimiter } = require("../../middlewares/rateLimiters");

@Module({
  imports: [DatabaseModule, AuthTokensModule, EmailDeliveriesModule, HttpModule, UsersPersistenceModule],
  controllers: [AuthController, MobileAuthController],
  providers: [AuthService, AuthRepository],
  exports: [AuthService, AuthRepository],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Preserve the same shared limiter and run it before request validation.
    consumer.apply(authRateLimiter).forRoutes(
      { path: "auth/mobile/login", method: RequestMethod.POST, version: "1" },
      ...["register", "login", "request-password-reset", "reset-password", "verify-email"].flatMap<RouteInfo>(
        (path) => [
          { path: `auth/${path}`, method: RequestMethod.POST },
          { path: `auth/${path}`, method: RequestMethod.POST, version: "1" },
        ],
      ),
    );
  }
}
