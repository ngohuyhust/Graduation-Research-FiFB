// Chuan hoa response loi va log loi ngoai du kien.
const { AppError } = require("../utils/errors/AppError");
const codes = require("../utils/errors/errorCodes");
const { env } = require("../config/env");
const { logger } = require("../utils/logger");

function errorHandler(error, req, res, _next) {
  const requestId = req.requestId;

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details || null,
      },
      requestId,
    });
  }

  logger.error("Unhandled request error", {
    requestId,
    method: req.method,
    url: req.originalUrl,
    error,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: codes.SERVER_ERROR,
      message: env.nodeEnv === "production" ? "Internal server error" : error.message || "Internal server error",
      details: null,
    },
    requestId,
  });
}

module.exports = { errorHandler };
