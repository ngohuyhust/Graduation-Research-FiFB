// Gom tat ca route module vao mot router /api.
const express = require("express");
const notificationRoutes = require("../modules/notifications/notifications.routes");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" }, message: "OK" });
});

router.use("/notifications", notificationRoutes);

module.exports = router;
