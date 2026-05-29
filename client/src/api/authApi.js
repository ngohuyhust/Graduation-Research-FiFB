import { httpClient } from "./httpClient";

export const authApi = {
  register: (payload) => httpClient.post("/auth/register", payload),
  verifyEmail: (token) => httpClient.post("/auth/verify-email", { token }),
  login: (payload) => httpClient.post("/auth/login", payload),
  refresh: (refreshToken) => httpClient.post("/auth/refresh", { refreshToken }),
  logout: (refreshToken) => httpClient.post("/auth/logout", { refreshToken }),
  me: () => httpClient.get("/auth/me"),
  changePassword: (payload) => httpClient.post("/auth/change-password", payload),
  requestPasswordReset: (email) => httpClient.post("/auth/request-password-reset", { email }),
  resetPassword: (payload) => httpClient.post("/auth/reset-password", payload),
};
