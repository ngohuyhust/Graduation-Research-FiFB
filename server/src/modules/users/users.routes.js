const express = require("express");
const controller = require("./users.controller");
const validation = require("./users.validation");
const { authenticate, requireActiveUser, requireVerifiedEmail, requireRoles } = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");
const { uuidParam } = require("../../utils/validators/commonSchemas");

const router = express.Router();

router.use(authenticate, requireActiveUser, requireVerifiedEmail);
router.get("/me", asyncHandler(controller.me));
router.patch("/me", validate(validation.updateProfileSchema), asyncHandler(controller.updateMe));
router.get("/", requireRoles("admin"), validate(validation.usersQuerySchema, "query"), asyncHandler(controller.list));
router.patch("/:id/status", requireRoles("admin"), validate(uuidParam, "params"), validate(validation.statusSchema), asyncHandler(controller.updateStatus));
router.get("/:id", requireRoles("admin"), validate(uuidParam, "params"), asyncHandler(controller.getById));

module.exports = router;
