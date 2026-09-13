// Gan va xoa refresh token trong cookie HTTP-only.
import type { Request, Response, CookieOptions } from "express";
const { env } = require("../../config/env");

const REFRESH_COOKIE_NAME = "fifb_refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

function parseCookieHeader(header = "") {
  return header.split(";").reduce<Record<string, string>>((cookies, part) => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) return cookies;
    const name = part.slice(0, separatorIndex).trim();
    const rawValue = part.slice(separatorIndex + 1).trim();
    if (!name) return cookies;
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
    return cookies;
  }, {});
}

function refreshCookieOptions(expiresAt?: Date | string) {
  const options: CookieOptions = {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.refreshCookieSameSite,
    path: REFRESH_COOKIE_PATH,
  };

  if (expiresAt) {
    const expires = new Date(expiresAt);
    options.expires = expires;
    options.maxAge = Math.max(0, expires.getTime() - Date.now());
  }

  return options;
}

export function getRefreshTokenCookie(req: Request) {
  return parseCookieHeader(req.headers.cookie)[REFRESH_COOKIE_NAME] || null;
}

export function setRefreshTokenCookie(res: Response, refreshToken: string, expiresAt: Date | string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(expiresAt));
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(new Date(0)));
}
