import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { HttpModule } from "../../common/http.module";
import { AuthController } from "./auth.controller";
import { AuthService, AUTH_REPOSITORY, AUTH_USER_REPOSITORY } from "./auth.service";
import * as authRepository from "./auth.repository";
import * as userRepository from "../users/users.repository";
const { authRateLimiter } = require("../../middlewares/rateLimiters");

@Module({
  imports: [HttpModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: AUTH_REPOSITORY, useValue: authRepository },
    { provide: AUTH_USER_REPOSITORY, useValue: userRepository },
  ],
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
