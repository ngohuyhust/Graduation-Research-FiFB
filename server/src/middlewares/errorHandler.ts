import type { ErrorRequestHandler, Request, Response } from "express";
// Chuan hoa response loi va log loi ngoai du kien.
import { AppError } from "../utils/errors/AppError";
const codes = require("../utils/errors/errorCodes");
const { env } = require("../config/env");
const { logger } = require("../utils/logger");

export function errorHandler(error: unknown, req: Request, res: Response, _next?: Parameters<ErrorRequestHandler>[3]) {
  void _next;
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
      message:
        env.nodeEnv === "production"
          ? "Internal server error"
          : error instanceof Error
            ? error.message
            : "Internal server error",
      details: null,
    },
    requestId,
  });
}
