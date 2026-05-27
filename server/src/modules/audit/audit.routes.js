const express = require("express");
const controller = require("./audit.controller");
const validation = require("./audit.validation");
const { validate } = require("../../utils/validators/validate");
const { asyncHandler } = require("../../middlewares/asyncHandler");

const router = express.Router();

router.get("/", validate(validation.auditQuerySchema, "query"), asyncHandler(controller.list));

module.exports = router;
