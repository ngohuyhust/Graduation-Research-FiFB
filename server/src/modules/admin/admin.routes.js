const express = require("express");
const controller = require("./admin.controller");
const validation = require("./admin.validation");
const { authenticate, requireActiveUser, requireVerifiedEmail, requireRoles } = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");

const router = express.Router();

router.use(authenticate, requireActiveUser, requireVerifiedEmail, requireRoles("admin"));
router.get("/users", validate(validation.usersQuerySchema, "query"), asyncHandler(controller.listUsers));
router.patch("/users/:id/status", validate(validation.uuidParam, "params"), validate(validation.statusSchema), asyncHandler(controller.updateUserStatus));
router.get("/certificates", validate(validation.deliveryQuerySchema, "query"), asyncHandler(controller.listCertificates));
router.patch("/certificates/:id/review", validate(validation.uuidParam, "params"), validate(validation.certificateReviewDecisionSchema), asyncHandler(controller.reviewCertificate));
router.get("/exercises", validate(validation.exerciseQuerySchema, "query"), asyncHandler(controller.listExercises));
router.patch("/exercises/:id/review", validate(validation.uuidParam, "params"), validate(validation.exerciseReviewDecisionSchema), asyncHandler(controller.reviewExercise));
router.patch("/exercises/:id/deactivate", validate(validation.uuidParam, "params"), asyncHandler(controller.deactivateExercise));
router.get("/audit-logs", validate(validation.auditQuerySchema, "query"), asyncHandler(controller.listAuditLogs));
router.get("/email-deliveries", validate(validation.deliveryQuerySchema, "query"), asyncHandler(controller.listEmailDeliveries));

module.exports = router;
