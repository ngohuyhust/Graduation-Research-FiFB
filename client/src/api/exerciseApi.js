import { httpClient } from "./httpClient";

export const exerciseApi = {
  list: (params) => httpClient.get("/exercises", { params }),
  detail: (id) => httpClient.get(`/exercises/${id}`),
  create: (payload) => httpClient.post("/exercises", payload),
  update: (id, payload) => httpClient.patch(`/exercises/${id}`, payload),
  submitAsTrainer: (payload) => httpClient.post("/trainers/me/exercises", payload),
  listBodyParts: () => httpClient.get("/exercise-taxonomy/bodyParts"),
  listEquipments: () => httpClient.get("/exercise-taxonomy/equipments"),
  listMuscles: () => httpClient.get("/exercise-taxonomy/muscles"),
  createBodyPart: (name) => httpClient.post("/exercise-taxonomy/bodyParts", { name }),
  createEquipment: (name) => httpClient.post("/exercise-taxonomy/equipments", { name }),
  createMuscle: (name) => httpClient.post("/exercise-taxonomy/muscles", { name }),
};
