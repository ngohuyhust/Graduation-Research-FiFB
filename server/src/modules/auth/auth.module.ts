import { EmailDeliveriesModule } from "../emailDeliveries/emailDeliveries.module";
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { AuthController } from "./auth.controller";
import { AuthService, AUTH_REPOSITORY } from "./auth.service";
import * as authRepository from "./auth.repository";
import { UsersPersistenceModule } from "../users/users-persistence.module";
const { authRateLimiter } = require("../../middlewares/rateLimiters");

@Module({
  imports: [EmailDeliveriesModule, HttpModule, UsersPersistenceModule],
  controllers: [AuthController],
  providers: [AuthService, { provide: AUTH_REPOSITORY, useValue: authRepository }],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Preserve the same shared limiter and run it before request validation.
    consumer.apply(authRateLimiter).forRoutes(
      ...["register", "login", "request-password-reset", "reset-password", "verify-email"].map((path) => ({
        path: `auth/${path}`,
        method: RequestMethod.POST,
      })),
    );
  }
}
