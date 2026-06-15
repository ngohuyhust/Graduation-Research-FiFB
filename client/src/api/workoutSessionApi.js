import { httpClient } from "./httpClient";

export const workoutSessionApi = {
  list: (params = { page: 1, limit: 50 }) => httpClient.get("/workout-sessions", { params }),
  create: (payload) => httpClient.post("/workout-sessions", payload),
  detail: (id) => httpClient.get(`/workout-sessions/${id}`),
  update: (id, payload) => httpClient.patch(`/workout-sessions/${id}`, payload),
  addLog: (id, payload) => httpClient.post(`/workout-sessions/${id}/logs`, payload),
  stats: () => httpClient.get("/workout-sessions/stats"),
  progression: (exerciseId) => httpClient.get(`/workout-sessions/progression/${exerciseId}`),
};
