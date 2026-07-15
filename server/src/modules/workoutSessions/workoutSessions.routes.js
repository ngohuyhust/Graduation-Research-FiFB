// Khai bao endpoint va middleware cho module workoutSessions.
const express = require("express");
const controller = require("./workoutSessions.controller");
const validation = require("./workoutSessions.validation");
const {
  authenticate,
  requireActiveUser,
  requireVerifiedEmail,
  requireRoles,
} = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");
const { paginationQuery, uuidParam } = require("../../utils/validators/commonSchemas");
const { z } = require("zod");

const router = express.Router();
const exerciseParam = z.object({ exerciseId: z.string().uuid() });

router.use(authenticate, requireActiveUser, requireVerifiedEmail, requireRoles("user", "trainer"));
router.get("/", validate(paginationQuery, "query"), asyncHandler(controller.list));
router.post("/", validate(validation.createSessionSchema), asyncHandler(controller.create));
router.get("/stats", asyncHandler(controller.stats));
router.get("/progression/:exerciseId", validate(exerciseParam, "params"), asyncHandler(controller.progression));
router.get("/:id", validate(uuidParam, "params"), asyncHandler(controller.detail));
router.patch(
  "/:id",
  validate(uuidParam, "params"),
  validate(validation.updateSessionSchema),
  asyncHandler(controller.update),
);
router.post(
  "/:id/logs",
  validate(uuidParam, "params"),
  validate(validation.exerciseLogSchema),
  asyncHandler(controller.addLog),
);

module.exports = router;
