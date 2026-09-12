// Gom tat ca route module vao mot router /api.
const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const userRoutes = require("../modules/users/users.routes");
const trainerRoutes = require("../modules/trainers/trainers.routes");
const trainerCertificateRoutes = require("../modules/trainerCertificates/trainerCertificates.routes");
const trainerReviewRoutes = require("../modules/reviews/reviews.routes");
const connectionRoutes = require("../modules/trainerConnections/trainerConnections.routes");
const favoriteRoutes = require("../modules/favorites/favorites.routes");
const workoutPlanRoutes = require("../modules/workoutPlans/workoutPlans.routes");
const notificationRoutes = require("../modules/notifications/notifications.routes");
const adminRoutes = require("../modules/admin/admin.routes");
const workoutSessionRoutes = require("../modules/workoutSessions/workoutSessions.routes");
const chatRoutes = require("../modules/chat/chat.routes");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" }, message: "OK" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/trainers", trainerRoutes);
router.use("/trainers", trainerCertificateRoutes);
router.use("/trainers", trainerReviewRoutes);
router.use("/trainer-connection-requests", connectionRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/workout-plans", workoutPlanRoutes);
router.use("/workout-sessions", workoutSessionRoutes);
router.use("/chat", chatRoutes);
router.use("/notifications", notificationRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
