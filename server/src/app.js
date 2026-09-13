// Nest owns migrated modules; Express routes remain during the incremental migration.
require("reflect-metadata");
const { NestFactory } = require("@nestjs/core");
const { ExpressAdapter } = require("@nestjs/platform-express");
const { AppModule } = require("./app.module");
const { UsersRepository } = require("./modules/users/users.repository");
const { createAuthenticate } = require("./middlewares/authenticate");
const { ApiExceptionFilter } = require("./common/api-exception.filter");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const morgan = require("morgan");
const { env } = require("./config/env");
const routes = require("./routes");
const { requestId } = require("./middlewares/requestId");
const { errorHandler } = require("./middlewares/errorHandler");
const { apiRateLimiter } = require("./middlewares/rateLimiters");
const { AppError } = require("./utils/errors/AppError");
const codes = require("./utils/errors/errorCodes");
const { logger } = require("./utils/logger");

morgan.token("request-id", (req) => req.requestId || "-");

function resolveCorsOrigin(origin, callback) {
  if (!origin || env.corsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new AppError(codes.FORBIDDEN, "Origin is not allowed by CORS", 403));
}

async function createApp() {
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
  app.use("/api", routes);
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
  app.locals.authenticate = createAuthenticate(nest.get(UsersRepository));
  return app;
}

module.exports = { createApp };
