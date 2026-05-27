const express = require("express");
const controller = require("./trainerCertificates.controller");
const validation = require("./trainerCertificates.validation");
const { authenticate, requireActiveUser, requireVerifiedEmail, requireRoles } = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");

const router = express.Router();

router.post("/me/certificates", authenticate, requireActiveUser, requireVerifiedEmail, requireRoles("trainer"), validate(validation.certificateSchema), asyncHandler(controller.submitMine));
router.get("/me/certificates", authenticate, requireActiveUser, requireVerifiedEmail, requireRoles("trainer"), asyncHandler(controller.listMine));

module.exports = router;
