// Goi API notification tu giao dien client.
import { httpClient } from "./httpClient";

export const notificationApi = {
  list: (params) => httpClient.get("/notifications", { params }),
  markRead: (id) => httpClient.patch(`/notifications/${id}/read`),
  markAllRead: () => httpClient.patch("/notifications/read-all"),
};
