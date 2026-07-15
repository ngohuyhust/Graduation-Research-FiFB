// Goi API workout plan tu giao dien client.
import { httpClient } from "./httpClient";

export const workoutPlanApi = {
  list: () => httpClient.get("/workout-plans"),
  create: (payload) => httpClient.post("/workout-plans", payload),
  detail: (id) => httpClient.get(`/workout-plans/${id}`),
  update: (id, payload) => httpClient.patch(`/workout-plans/${id}`, payload),
  archive: (id) => httpClient.delete(`/workout-plans/${id}`),
};
