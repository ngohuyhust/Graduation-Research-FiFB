// Nest owns all API routes; Express supplies the HTTP adapter and shared middleware.
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import express, { type Request } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import { requestId } from "./middlewares/requestId";
import { errorHandler } from "./middlewares/errorHandler";
import { apiRateLimiter } from "./middlewares/rateLimiters";
import { AppError } from "./utils/errors/AppError";
import codes = require("./utils/errors/errorCodes");
import { logger } from "./utils/logger";

morgan.token("request-id", (req) => (req as Request).requestId || "-");

function resolveCorsOrigin(origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) {
  if (!origin || env.corsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new AppError(codes.FORBIDDEN, "Origin is not allowed by CORS", 403));
}

export async function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(requestId);
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: resolveCorsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms :request-id", {
      skip: () => env.nodeEnv === "test",
      stream: { write: (message) => logger.info(message.trim(), { type: "http" }) },
    }),
  );
  app.use("/api", apiRateLimiter);
  app.use(errorHandler);
  const nest = await NestFactory.create(AppModule, new ExpressAdapter(app), {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  nest.setGlobalPrefix("api");
  nest.useGlobalFilters(new ApiExceptionFilter());
  await nest.init();
  app.locals.nest = nest;
  return app;
}
