const express = require("express");
const controller = require("./trainerConnections.controller");
const validation = require("./trainerConnections.validation");
const {
  authenticate,
  requireActiveUser,
  requireVerifiedEmail,
  requireRoles,
} = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");
const { uuidParam } = require("../../utils/validators/commonSchemas");

const router = express.Router();

router.use(authenticate, requireActiveUser, requireVerifiedEmail);
router.get("/", asyncHandler(controller.list));
router.get("/connections", asyncHandler(controller.listConnections));
router.post("/", validate(validation.connectionRequestSchema), asyncHandler(controller.create));
router.patch("/:id/cancel", validate(uuidParam, "params"), asyncHandler(controller.cancel));
router.patch("/:id/approve", requireRoles("trainer"), validate(uuidParam, "params"), asyncHandler(controller.approve));
router.patch(
  "/:id/reject",
  requireRoles("trainer"),
  validate(uuidParam, "params"),
  validate(validation.rejectConnectionSchema),
  asyncHandler(controller.reject),
);

module.exports = router;
