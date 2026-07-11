const { env } = require("../../config/env");

const REFRESH_COOKIE_NAME = "fifb_refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

function parseCookieHeader(header = "") {
  return header.split(";").reduce((cookies, part) => {
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

function refreshCookieOptions(expiresAt) {
  const options = {
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

function getRefreshTokenCookie(req) {
  return parseCookieHeader(req.headers.cookie)[REFRESH_COOKIE_NAME] || null;
}

function setRefreshTokenCookie(res, refreshToken, expiresAt) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(expiresAt));
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(new Date(0)));
}

module.exports = {
  getRefreshTokenCookie,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
