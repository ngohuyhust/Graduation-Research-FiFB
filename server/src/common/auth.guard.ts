import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response, RequestHandler } from "express";
const { authenticate, requireActiveUser, requireVerifiedEmail, requireRoles } = require("../middlewares/authenticate");

export interface Actor {
  userId: string;
  role: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  auth: Actor;
}

const ROLES_KEY = "allowedRoles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    // The remaining Express admin router can already have authenticated this request.
    const checks: RequestHandler[] = [requireActiveUser, requireVerifiedEmail];
    if (!request.auth) checks.unshift(authenticate);
    if (roles) checks.push(requireRoles(...roles));
    for (const check of checks) {
      await new Promise<void>((resolve, reject) => {
        check(request, response, (error?: unknown) => (error ? reject(error) : resolve()));
      });
    }
    return true;
  }
}
