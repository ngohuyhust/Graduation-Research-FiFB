const express = require("express");
const controller = require("./authController");
const schemas = require("./authSchemas");
const { validate } = require("../../utils/validators/validate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { authenticate, requireActiveUser, requireVerifiedEmail } = require("../../middlewares/authenticate");
const { authRateLimiter } = require("../../middlewares/rateLimiters");

const router = express.Router();

router.post("/register", authRateLimiter, validate(schemas.registerSchema), asyncHandler(controller.register));
router.post("/login", authRateLimiter, validate(schemas.loginSchema), asyncHandler(controller.login));
router.post("/refresh", validate(schemas.refreshSchema), asyncHandler(controller.refresh));
router.post("/logout", validate(schemas.logoutSchema), asyncHandler(controller.logout));
router.get("/me", authenticate, requireActiveUser, requireVerifiedEmail, asyncHandler(controller.me));
router.post("/change-password", authenticate, requireActiveUser, requireVerifiedEmail, validate(schemas.changePasswordSchema), asyncHandler(controller.changePassword));
router.post("/request-password-reset", authRateLimiter, validate(schemas.requestPasswordResetSchema), asyncHandler(controller.requestPasswordReset));
router.post("/reset-password", authRateLimiter, validate(schemas.resetPasswordSchema), asyncHandler(controller.resetPassword));
router.post("/verify-email", authRateLimiter, validate(schemas.verifyEmailSchema), asyncHandler(controller.verifyEmail));

module.exports = router;
