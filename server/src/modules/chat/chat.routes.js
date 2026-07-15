// Khai bao endpoint va middleware cho module chat.
const express = require("express");
const controller = require("./chat.controller");
const validation = require("./chat.validation");
const {
  authenticate,
  requireActiveUser,
  requireVerifiedEmail,
  requireRoles,
} = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");

const router = express.Router();

router.use(authenticate, requireActiveUser, requireVerifiedEmail, requireRoles("user", "trainer"));
router.get("/unread", asyncHandler(controller.unread));
router.get(
  "/:connectionId/messages",
  validate(validation.connectionParam, "params"),
  validate(validation.messageQuery, "query"),
  asyncHandler(controller.list),
);
router.post(
  "/:connectionId/messages",
  validate(validation.connectionParam, "params"),
  validate(validation.messageSchema),
  asyncHandler(controller.send),
);
router.patch("/:connectionId/read", validate(validation.connectionParam, "params"), asyncHandler(controller.markRead));

module.exports = router;
