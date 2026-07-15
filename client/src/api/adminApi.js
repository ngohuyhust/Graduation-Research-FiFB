// Goi API admin tu giao dien client.
import { httpClient } from "./httpClient";

export const adminApi = {
  users: (params) => httpClient.get("/admin/users", { params }),
  updateUserStatus: (id, status) => httpClient.patch(`/admin/users/${id}/status`, { status }),
  certificates: (params) => httpClient.get("/admin/certificates", { params }),
  reviewCertificate: (id, payload) => httpClient.patch(`/admin/certificates/${id}/review`, payload),
  exercises: (params) => httpClient.get("/admin/exercises", { params }),
  reviewExercise: (id, payload) => httpClient.patch(`/admin/exercises/${id}/review`, payload),
  deactivateExercise: (id) => httpClient.patch(`/admin/exercises/${id}/deactivate`),
  auditLogs: (params) => httpClient.get("/admin/audit-logs", { params }),
  emailDeliveries: (params) => httpClient.get("/admin/email-deliveries", { params }),
};
