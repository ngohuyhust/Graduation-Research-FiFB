const express = require("express");
const controller = require("./reviews.controller");
const validation = require("./reviews.validation");
const { authenticate, requireActiveUser, requireVerifiedEmail } = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");
const { uuidParam, paginationQuery } = require("../../utils/validators/commonSchemas");

const router = express.Router();

router.post(
  "/:id/reviews",
  authenticate,
  requireActiveUser,
  requireVerifiedEmail,
  validate(uuidParam, "params"),
  validate(validation.reviewSchema),
  asyncHandler(controller.create),
);
router.get(
  "/:id/reviews",
  validate(uuidParam, "params"),
  validate(paginationQuery, "query"),
  asyncHandler(controller.list),
);

module.exports = router;
