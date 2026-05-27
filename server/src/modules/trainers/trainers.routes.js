const express = require("express");
const controller = require("./trainers.controller");
const validation = require("./trainers.validation");
const { authenticate, requireActiveUser, requireVerifiedEmail, requireRoles } = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");
const { uuidParam } = require("../../utils/validators/commonSchemas");

const router = express.Router();

router.get("/", validate(validation.trainerQuerySchema, "query"), asyncHandler(controller.list));
router.put("/me/profile", authenticate, requireActiveUser, requireVerifiedEmail, requireRoles("trainer"), validate(validation.trainerProfileSchema), asyncHandler(controller.saveMe));
router.get("/:id", validate(uuidParam, "params"), asyncHandler(controller.detail));

module.exports = router;
