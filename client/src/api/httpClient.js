import axios from "axios";
import { getErrorMessage } from "../utils/errors";
import { clearTokens, getAccessToken, getTokenVersion, setAccessToken } from "./tokenStore";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";
let onUnauthorized = null;
let refreshPromise = null;
let unauthorizedNotified = false;

const skipRefreshPaths = [
  "/auth/register",
  "/auth/verify-email",
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/request-password-reset",
  "/auth/reset-password",
];

const publicGetPathPatterns = [
  /^\/exercises(?:\/[^/]+)?$/,
  /^\/exercise-taxonomy\/(?:bodyParts|equipments|muscles)$/,
  /^\/trainers(?:\/[^/]+)?$/,
];

export const httpClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function normalizeError(error) {
  const payload = error.response?.data;
  const method = (error.config?.method || "get").toUpperCase();
  const url = error.config?.url || "";
  let normalizedError;

  if (payload?.error) {
    normalizedError = {
      code: payload.error.code || "API_ERROR",
      message: payload.error.message || "Request failed",
      details: payload.error.details || null,
      requestId: payload.requestId || null,
      status: error.response?.status,
      method,
      url,
    };
  } else {
    normalizedError = {
      code: error.code || "NETWORK_ERROR",
      message: error.message || "Unable to reach server",
      details: null,
      requestId: null,
      status: error.response?.status,
      method,
      url,
    };
  }

  return {
    ...normalizedError,
    userMessage: getErrorMessage(normalizedError),
  };
}

function logApiError(error) {
  console.error("[API Error]", {
    method: error.method,
    url: error.url,
    status: error.status,
    code: error.code,
    message: error.userMessage || error.message,
    requestId: error.requestId,
    details: error.details,
  });
}

async function refreshTokens() {
  const startedAtVersion = getTokenVersion();
  const response = await axios.post(`${baseURL}/auth/refresh`, null, { withCredentials: true });
  const tokens = response.data?.data;
  const nextAccessToken = tokens?.accessToken;
  if (!nextAccessToken) throw new Error("Refresh did not return an access token");
  if (getTokenVersion() === startedAtVersion) setAccessToken(nextAccessToken);
  unauthorizedNotified = false;
  return getAccessToken() || nextAccessToken;
}

function getRequestPath(url = "") {
  const [withoutQuery] = url.split("?");
  if (!withoutQuery) return "";
  if (!/^https?:\/\//i.test(withoutQuery)) return withoutQuery;

  try {
    return new URL(withoutQuery).pathname;
  } catch {
    return withoutQuery;
  }
}

function isPublicGetRequest(config) {
  const method = (config?.method || "get").toLowerCase();
  if (method !== "get") return false;

  const path = getRequestPath(config?.url);
  return publicGetPathPatterns.some((pattern) => pattern.test(path));
}

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) unauthorizedNotified = false;
  if (token && !isPublicGetRequest(config)) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response.data?.data ?? null,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const path = getRequestPath(original?.url || "");
    const shouldSkipRefresh = skipRefreshPaths.some((skipPath) => path === skipPath) || isPublicGetRequest(original);

    if (status === 401 && original && !original._retry && !shouldSkipRefresh) {
      original._retry = true;
      try {
        refreshPromise ||= refreshTokens().finally(() => {
          refreshPromise = null;
        });
        const token = await refreshPromise;
        original.headers ||= {};
        original.headers.Authorization = `Bearer ${token}`;
        return httpClient(original);
      } catch (refreshError) {
        clearTokens();
        if (!unauthorizedNotified) {
          unauthorizedNotified = true;
          onUnauthorized?.();
        }
        const normalizedRefreshError = normalizeError(refreshError);
        logApiError(normalizedRefreshError);
        throw normalizedRefreshError;
      }
    }

    const normalizedError = normalizeError(error);
    logApiError(normalizedError);
    throw normalizedError;
  },
);
