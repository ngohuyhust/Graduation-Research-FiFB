// Gom tat ca route module vao mot router /api.
const express = require("express");
const notificationRoutes = require("../modules/notifications/notifications.routes");
const chatRoutes = require("../modules/chat/chat.routes");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" }, message: "OK" });
});

router.use("/chat", chatRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
