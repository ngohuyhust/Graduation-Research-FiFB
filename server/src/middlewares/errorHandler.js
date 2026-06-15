const { AppError } = require("../utils/errors/AppError");
const codes = require("../utils/errors/errorCodes");

function errorHandler(error, req, res, _next) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      code: error.code || codes.SERVER_ERROR,
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    }),
  );

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      requestId: req.requestId,
      error: {
        code: error.code,
        message: error.message,
        details: error.details || {},
      },
    });
  }

  return res.status(500).json({
    success: false,
    requestId: req.requestId,
    error: {
      code: codes.SERVER_ERROR,
      message: "Internal server error",
      details: {},
    },
  });
}

module.exports = { errorHandler };
