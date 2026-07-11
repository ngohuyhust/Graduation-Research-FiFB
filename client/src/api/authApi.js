import { httpClient } from "./httpClient";

export const authApi = {
  register: (payload) => httpClient.post("/auth/register", payload),
  verifyEmail: (payload) => httpClient.post("/auth/verify-email", payload),
  login: (payload) => httpClient.post("/auth/login", payload),
  refresh: () => httpClient.post("/auth/refresh"),
  logout: () => httpClient.post("/auth/logout"),
  me: () => httpClient.get("/auth/me"),
  changePassword: (payload) => httpClient.post("/auth/change-password", payload),
  requestPasswordReset: (email) => httpClient.post("/auth/request-password-reset", { email }),
  resetPassword: (payload) => httpClient.post("/auth/reset-password", payload),
};
