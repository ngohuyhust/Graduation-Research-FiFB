const { z } = require("zod");
const usersValidation = require("../users/users.validation");
const exercisesValidation = require("../exercises/exercises.validation");
const certificatesValidation = require("../trainerCertificates/trainerCertificates.validation");
const auditValidation = require("../audit/audit.validation");
const emailDeliveriesValidation = require("../emailDeliveries/emailDeliveries.validation");

module.exports = {
  usersQuerySchema: usersValidation.usersQuerySchema,
  statusSchema: usersValidation.statusSchema,
  exerciseQuerySchema: exercisesValidation.exerciseQuerySchema,
  exerciseReviewDecisionSchema: exercisesValidation.reviewDecisionSchema,
  certificateReviewDecisionSchema: certificatesValidation.reviewDecisionSchema,
  auditQuerySchema: auditValidation.auditQuerySchema,
  certificateQuerySchema: certificatesValidation.certificateQuerySchema,
  deliveryQuerySchema: emailDeliveriesValidation.deliveryQuerySchema,
  uuidParam: z.object({ id: z.string().uuid() }),
};
