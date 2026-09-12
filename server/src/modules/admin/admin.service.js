// Service chua nghiep vu chinh cua module admin.
const usersService = require("../users/users.service");
const certificateService = require("../trainerCertificates/trainerCertificates.service");
const auditService = require("../audit/audit.service");
const emailDeliveriesService = require("../emailDeliveries/emailDeliveries.service");

module.exports = {
  listUsers: usersService.listUsers,
  updateUserStatus: usersService.updateUserStatus,
  listCertificates: certificateService.listAll,
  reviewCertificate: certificateService.review,
  listAuditLogs: auditService.listAuditLogs,
  listEmailDeliveries: emailDeliveriesService.list,
};
