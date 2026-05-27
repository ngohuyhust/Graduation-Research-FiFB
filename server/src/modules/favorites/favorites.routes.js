const express = require("express");
const controller = require("./favorites.controller");
const validation = require("./favorites.validation");
const { authenticate, requireActiveUser, requireVerifiedEmail, requireRoles } = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");
const { uuidParam, paginationQuery } = require("../../utils/validators/commonSchemas");

const router = express.Router();

router.use(authenticate, requireActiveUser, requireVerifiedEmail, requireRoles("user", "trainer"));
router.get("/", validate(paginationQuery, "query"), asyncHandler(controller.list));
router.post("/", validate(validation.favoriteSchema), asyncHandler(controller.add));
router.delete("/:id", validate(uuidParam, "params"), asyncHandler(controller.remove));

module.exports = router;
