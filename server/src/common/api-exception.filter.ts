import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
const { AppError } = require("../utils/errors/AppError");
const { errorHandler } = require("../middlewares/errorHandler");
const codes = require("../utils/errors/errorCodes");

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest();
    let error = exception;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code =
        {
          400: codes.VALIDATION_ERROR,
          401: codes.UNAUTHENTICATED,
          403: codes.FORBIDDEN,
          404: codes.NOT_FOUND,
        }[status] || codes.SERVER_ERROR;
      const message = status === 404 ? `Route not found: ${request.method} ${request.originalUrl}` : exception.message;
      error = new AppError(code, message, status);
    }
    return errorHandler(error, request, http.getResponse(), undefined);
  }
}
