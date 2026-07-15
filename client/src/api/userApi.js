// Goi API user tu giao dien client.
import { httpClient } from "./httpClient";

export const userApi = {
  getProfile: () => httpClient.get("/users/me"),
  updateProfile: (payload) => httpClient.patch("/users/me", payload),
};
