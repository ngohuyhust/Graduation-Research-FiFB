const usersService = require("../users/users.service");
const certificateService = require("../trainerCertificates/trainerCertificates.service");
const exercisesService = require("../exercises/exercises.service");
const auditService = require("../audit/audit.service");
const emailDeliveriesService = require("../emailDeliveries/emailDeliveries.service");

module.exports = {
  listUsers: usersService.listUsers,
  updateUserStatus: usersService.updateUserStatus,
  listCertificates: certificateService.listAll,
  reviewCertificate: certificateService.review,
  listExercises: (query) => exercisesService.listExercises(query, true),
  reviewExercise: exercisesService.reviewExercise,
  deactivateExercise: exercisesService.deactivateExercise,
  listAuditLogs: auditService.listAuditLogs,
  listEmailDeliveries: emailDeliveriesService.list,
};
