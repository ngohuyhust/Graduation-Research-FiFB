import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response, RequestHandler } from "express";
import { UsersRepository } from "../modules/users/users.repository";
import type { UserRow } from "../modules/users/users.types";
const {
  createAuthenticate,
  requireActiveUser,
  requireVerifiedEmail,
  requireRoles,
} = require("../middlewares/authenticate");

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
    private readonly reflector: Reflector,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const checks: RequestHandler[] = [requireActiveUser, requireVerifiedEmail];
    checks.unshift(createAuthenticate(this.users));
    if (roles) checks.push(requireRoles(...roles));
    for (const check of checks) {
      await new Promise<void>((resolve, reject) => {
        check(request, response, (error?: unknown) => (error ? reject(error) : resolve()));
      });
    }
    return true;
  }
}
