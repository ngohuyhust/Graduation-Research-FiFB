// Tao loi 404 khi request khong khop route nao.
const { AppError } = require("../utils/errors/AppError");
const codes = require("../utils/errors/errorCodes");

function notFound(req, _res, next) {
  next(new AppError(codes.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`, 404));
}

module.exports = { notFound };
