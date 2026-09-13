import { Injectable } from "@nestjs/common";
import type { TokenUser } from "./auth.types";
const jwt = require("jsonwebtoken");
const { env } = require("../../config/env");
export interface AccessTokenPayload {
  sub: string;
  role: string;
  status: string;
  iat: number;
  exp: number;
}
@Injectable()
export class JwtService {
  signAccessToken(user: TokenUser): string {
    return jwt.sign({ sub: user.id, role: user.role, status: user.status }, env.jwtAccessSecret, {
      expiresIn: env.jwtAccessExpiresIn,
    });
  }
  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.jwtAccessSecret);
  }
}
