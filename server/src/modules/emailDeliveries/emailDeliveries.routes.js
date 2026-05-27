const express = require("express");
const controller = require("./emailDeliveries.controller");
const validation = require("./emailDeliveries.validation");
const { validate } = require("../../utils/validators/validate");
const { asyncHandler } = require("../../middlewares/asyncHandler");

const router = express.Router();

router.get("/", validate(validation.deliveryQuerySchema, "query"), asyncHandler(controller.list));

module.exports = router;
