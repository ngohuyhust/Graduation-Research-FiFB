const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const morgan = require("morgan");
const { env } = require("./config/env");
const routes = require("./routes");
const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorHandler");
const { requestId } = require("./middlewares/requestId");
const { apiRateLimiter } = require("./middlewares/rateLimiters");

function resolveCorsOrigin(origin, callback) {
  if (!origin || env.corsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error("Not allowed by CORS"));
}

function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());
  app.use(requestId);
  app.use(cors({ origin: resolveCorsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.nodeEnv === "test" ? "tiny" : "dev"));
  app.use("/api", apiRateLimiter);
  app.use("/api", routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
