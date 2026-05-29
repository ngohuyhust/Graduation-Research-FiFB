import { httpClient } from "./httpClient";

export const trainerApi = {
  list: (params) => httpClient.get("/trainers", { params }),
  detail: (id) => httpClient.get(`/trainers/${id}`),
  updateProfile: (payload) => httpClient.put("/trainers/me/profile", payload),
  submitCertificate: (payload) => httpClient.post("/trainers/me/certificates", payload),
  myCertificates: () => httpClient.get("/trainers/me/certificates"),
  incomingRequests: () => httpClient.get("/trainers/me/requests"),
  myConnections: () => httpClient.get("/trainers/me/connections"),
  sendRequest: (payload) => httpClient.post("/trainer-connection-requests", payload),
  requests: () => httpClient.get("/trainer-connection-requests"),
  connections: () => httpClient.get("/trainer-connection-requests/connections"),
  cancelRequest: (id) => httpClient.patch(`/trainer-connection-requests/${id}/cancel`),
  approveRequest: (id) => httpClient.patch(`/trainer-connection-requests/${id}/approve`),
  rejectRequest: (id, rejectReason) => httpClient.patch(`/trainer-connection-requests/${id}/reject`, { rejectReason }),
  reviews: (trainerId) => httpClient.get(`/trainers/${trainerId}/reviews`),
  reviewTrainer: (trainerId, payload) => httpClient.post(`/trainers/${trainerId}/reviews`, payload),
};
