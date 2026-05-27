const { ZodError } = require("zod");
const { AppError } = require("../errors/AppError");
const codes = require("../errors/errorCodes");

function validate(schema, source = "body") {
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

module.exports = { validate };
