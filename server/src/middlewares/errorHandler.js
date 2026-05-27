const { AppError } = require("../utils/errors/AppError");
const codes = require("../utils/errors/errorCodes");

function errorHandler(error, _req, res, _next) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details || {},
      },
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    error: {
      code: codes.SERVER_ERROR,
      message: "Internal server error",
      details: {},
    },
  });
}

module.exports = { errorHandler };
