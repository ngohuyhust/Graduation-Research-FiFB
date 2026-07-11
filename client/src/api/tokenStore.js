let accessToken = null;
const refreshKey = "fifb_refresh_token";
let tokenVersion = 0;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
  tokenVersion += 1;
}

export function getTokenVersion() {
  return tokenVersion;
}

export function clearTokens() {
  accessToken = null;
  tokenVersion += 1;
  clearLegacyRefreshToken();
}

export function clearLegacyRefreshToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(refreshKey);
}

clearLegacyRefreshToken();
