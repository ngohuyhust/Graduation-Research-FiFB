// Gom tat ca route module vao mot router /api.
const express = require("express");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" }, message: "OK" });
});


module.exports = router;
