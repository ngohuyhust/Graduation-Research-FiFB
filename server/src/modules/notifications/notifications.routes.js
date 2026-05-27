const express = require("express");
const controller = require("./notifications.controller");
const validation = require("./notifications.validation");
const { authenticate, requireActiveUser, requireVerifiedEmail } = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");
const { uuidParam } = require("../../utils/validators/commonSchemas");

const router = express.Router();

router.use(authenticate, requireActiveUser, requireVerifiedEmail);
router.get("/", validate(validation.notificationQuerySchema, "query"), asyncHandler(controller.list));
router.patch("/read-all", asyncHandler(controller.markAllRead));
router.patch("/:id/read", validate(uuidParam, "params"), asyncHandler(controller.markRead));

module.exports = router;
