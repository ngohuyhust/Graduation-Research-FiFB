const express = require("express");
const controller = require("./exercises.controller");
const validation = require("./exercises.validation");
const {
  authenticate,
  requireActiveUser,
  requireVerifiedEmail,
  requireRoles,
} = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");
const { uuidParam } = require("../../utils/validators/commonSchemas");
const { cacheResponse } = require("../../middlewares/cacheResponse");

const router = express.Router();

router.get(
  "/",
  cacheResponse(300, "exercises"),
  validate(validation.exerciseQuerySchema, "query"),
  asyncHandler(controller.list),
);
router.get("/:id", validate(uuidParam, "params"), asyncHandler(controller.detail));
router.post(
  "/",
  authenticate,
  requireActiveUser,
  requireVerifiedEmail,
  requireRoles("admin", "trainer"),
  validate(validation.exercisePayloadSchema),
  asyncHandler(controller.create),
);
router.patch(
  "/:id",
  authenticate,
  requireActiveUser,
  requireVerifiedEmail,
  requireRoles("admin"),
  validate(uuidParam, "params"),
  validate(validation.exerciseUpdateSchema),
  asyncHandler(controller.update),
);

module.exports = router;
