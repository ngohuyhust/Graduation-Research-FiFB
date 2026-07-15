// Khai bao endpoint va middleware cho module exerciseTaxonomy.
const express = require("express");
const controller = require("./exerciseTaxonomy.controller");
const validation = require("./exerciseTaxonomy.validation");
const {
  authenticate,
  requireActiveUser,
  requireVerifiedEmail,
  requireRoles,
} = require("../../middlewares/authenticate");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const { validate } = require("../../utils/validators/validate");
const { cacheResponse } = require("../../middlewares/cacheResponse");

const router = express.Router();

for (const kind of ["bodyParts", "equipments", "muscles"]) {
  router.get(`/${kind}`, cacheResponse(900, "taxonomy"), asyncHandler(controller.list(kind)));
  router.post(
    `/${kind}`,
    authenticate,
    requireActiveUser,
    requireVerifiedEmail,
    requireRoles("admin"),
    validate(validation.taxonomySchema),
    asyncHandler(controller.create(kind)),
  );
}

module.exports = router;
