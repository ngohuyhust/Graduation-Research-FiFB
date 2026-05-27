const rateLimit = require("express-rate-limit");

function createRateLimiter(options) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
}

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many auth attempts. Try again later.",
      details: {},
    },
  },
});

module.exports = { authRateLimiter };
