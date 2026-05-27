const express = require("express");
const controller = require("./auth.controller");
const validation = require("./auth.validation");
const { validate } = require("../../utils/validators/validate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { authenticate, requireActiveUser, requireVerifiedEmail } = require("../../middlewares/authenticate");
const { authRateLimiter } = require("../../middlewares/rateLimiters");

const router = express.Router();

router.post("/register", authRateLimiter, validate(validation.registerSchema), asyncHandler(controller.register));
router.post("/login", authRateLimiter, validate(validation.loginSchema), asyncHandler(controller.login));
router.post("/refresh", validate(validation.refreshSchema), asyncHandler(controller.refresh));
router.post("/logout", validate(validation.logoutSchema), asyncHandler(controller.logout));
router.get("/me", authenticate, requireActiveUser, requireVerifiedEmail, asyncHandler(controller.me));
router.post("/change-password", authenticate, requireActiveUser, requireVerifiedEmail, validate(validation.changePasswordSchema), asyncHandler(controller.changePassword));
router.post("/request-password-reset", authRateLimiter, validate(validation.requestPasswordResetSchema), asyncHandler(controller.requestPasswordReset));
router.post("/reset-password", authRateLimiter, validate(validation.resetPasswordSchema), asyncHandler(controller.resetPassword));
router.post("/verify-email", authRateLimiter, validate(validation.verifyEmailSchema), asyncHandler(controller.verifyEmail));

module.exports = router;
