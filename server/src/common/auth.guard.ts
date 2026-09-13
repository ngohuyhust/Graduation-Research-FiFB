import { JwtService } from "../modules/auth/jwt.service";
import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { UsersRepository } from "../modules/users/users.repository";
import type { UserRow } from "../modules/users/users.types";
const { AppError } = require("../utils/errors/AppError");
const codes = require("../utils/errors/errorCodes");

export interface Actor {
  userId: string;
  role: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  auth: Actor;
  user: UserRow;
}

const ROLES_KEY = "allowedRoles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    try {
      const [scheme, token] = (request.headers.authorization || "").split(" ");
      if (scheme !== "Bearer" || !token) {
        throw new AppError(codes.UNAUTHENTICATED, "Missing bearer token", 401);
      }
      const payload = this.jwt.verifyAccessToken(token);
      const user = await this.users.findById(payload.sub);
      if (!user) throw new AppError(codes.UNAUTHENTICATED, "Invalid token subject", 401);
      request.auth = { userId: user.id, role: user.role, status: user.status };
      request.user = user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(codes.UNAUTHENTICATED, "Invalid or expired token", 401);
    }
    if (request.auth.status !== "active") {
      throw new AppError(codes.FORBIDDEN, "Account is not active", 403);
    }
    if (!request.user.email_verified_at) {
      throw new AppError(codes.FORBIDDEN, "Email verification required", 403);
    }
    if (roles && !roles.includes(request.auth.role)) {
      throw new AppError(codes.FORBIDDEN, "Insufficient role", 403);
    }
    return true;
  }
}
