import { httpClient } from "./httpClient";

export const favoriteApi = {
  list: () => httpClient.get("/favorites"),
  add: (exerciseId) => httpClient.post("/favorites", { exerciseId }),
  remove: (exerciseId) => httpClient.delete(`/favorites/${exerciseId}`),
};
