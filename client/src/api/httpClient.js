import axios from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from "./tokenStore";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";
let onUnauthorized = null;
let refreshPromise = null;

const publicAuthPaths = [
  "/auth/register",
  "/auth/verify-email",
  "/auth/login",
  "/auth/request-password-reset",
  "/auth/reset-password",
];

export const httpClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function normalizeError(error) {
  const payload = error.response?.data;
  if (payload?.error) {
    return {
      code: payload.error.code || "API_ERROR",
      message: payload.error.message || "Request failed",
      details: payload.error.details || null,
      status: error.response?.status,
    };
  }

  return {
    code: error.code || "NETWORK_ERROR",
    message: error.message || "Unable to reach server",
    details: null,
    status: error.response?.status,
  };
}

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("Missing refresh token");

  const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
  const tokens = response.data?.data;
  setAccessToken(tokens?.accessToken);
  setRefreshToken(tokens?.refreshToken);
  return tokens?.accessToken;
}

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response.data?.data ?? null,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || "";
    const shouldSkipRefresh = publicAuthPaths.some((path) => url.includes(path)) || url.includes("/auth/refresh");
    const canRefresh = Boolean(getRefreshToken());

    if (status === 401 && original && !original._retry && !shouldSkipRefresh && canRefresh) {
      original._retry = true;
      try {
        refreshPromise ||= refreshTokens().finally(() => {
          refreshPromise = null;
        });
        const token = await refreshPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return httpClient(original);
      } catch (refreshError) {
        clearTokens();
        onUnauthorized?.();
        throw normalizeError(refreshError);
      }
    }

    throw normalizeError(error);
  },
);
