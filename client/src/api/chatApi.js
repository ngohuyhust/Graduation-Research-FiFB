// Goi API chat tu giao dien client.
import { httpClient } from "./httpClient";

export const chatApi = {
  messages: (connectionId, params = { page: 1, limit: 100 }) =>
    httpClient.get(`/chat/${connectionId}/messages`, { params }),
  send: (connectionId, payload) => httpClient.post(`/chat/${connectionId}/messages`, payload),
  markRead: (connectionId) => httpClient.patch(`/chat/${connectionId}/read`),
  unread: () => httpClient.get("/chat/unread"),
};
