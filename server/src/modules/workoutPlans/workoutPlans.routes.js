// Khai bao endpoint va middleware cho module workoutPlans.
const express = require("express");
const controller = require("./workoutPlans.controller");
const validation = require("./workoutPlans.validation");
const {
  authenticate,
  requireActiveUser,
  requireVerifiedEmail,
  requireRoles,
} = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");
const { uuidParam, paginationQuery } = require("../../utils/validators/commonSchemas");

const router = express.Router();

router.use(authenticate, requireActiveUser, requireVerifiedEmail, requireRoles("user", "trainer", "admin"));
router.get("/", validate(paginationQuery, "query"), asyncHandler(controller.list));
router.post("/", validate(validation.workoutPlanSchema), asyncHandler(controller.create));
router.get("/:id", validate(uuidParam, "params"), asyncHandler(controller.detail));
router.patch(
  "/:id",
  validate(uuidParam, "params"),
  validate(validation.workoutPlanUpdateSchema),
  asyncHandler(controller.update),
);
router.delete("/:id", validate(uuidParam, "params"), asyncHandler(controller.archive));

module.exports = router;
