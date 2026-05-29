let accessToken = null;
const refreshKey = "fifb_refresh_token";

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getRefreshToken() {
  return window.localStorage.getItem(refreshKey);
}

export function setRefreshToken(token) {
  if (token) window.localStorage.setItem(refreshKey, token);
  else window.localStorage.removeItem(refreshKey);
}

export function clearTokens() {
  accessToken = null;
  window.localStorage.removeItem(refreshKey);
}
