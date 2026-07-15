// Gan requestId de trace log va response.
const crypto = require("crypto");

function requestId(req, res, next) {
  const incomingId = req.get("X-Request-Id");
  req.requestId = incomingId && incomingId.length <= 128 ? incomingId : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

module.exports = { requestId };
