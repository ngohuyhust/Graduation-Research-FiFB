// Middleware validate request bang schema.
import { ZodError, type ZodTypeAny } from "zod";
import type { RequestHandler } from "express";
const { AppError } = require("../errors/AppError");
const codes = require("../errors/errorCodes");

export function validate(schema: ZodTypeAny, source: "body" | "query" | "params" = "body"): RequestHandler {
  return (req, _res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError(codes.VALIDATION_ERROR, "Request validation failed", 400, error.flatten()));
        return;
      }
      next(error);
    }
  };
}
