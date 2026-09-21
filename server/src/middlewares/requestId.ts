// Gan requestId de trace log va response.
import * as crypto from "crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (req, res, next) => {
  const incomingId = req.get("X-Request-Id");
  req.requestId = incomingId && incomingId.length <= 128 ? incomingId : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
};
