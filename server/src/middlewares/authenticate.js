// Xac thuc JWT va kiem tra quyen/trang thai nguoi dung.
const { verifyAccessToken } = require("../modules/auth/jwt.service");
const userRepository = require("../modules/users/users.repository");
const { AppError } = require("../utils/errors/AppError");
const codes = require("../utils/errors/errorCodes");

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new AppError(codes.UNAUTHENTICATED, "Missing bearer token", 401);
    }
    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);
    if (!user) throw new AppError(codes.UNAUTHENTICATED, "Invalid token subject", 401);
    req.auth = { userId: user.id, role: user.role, status: user.status };
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(codes.UNAUTHENTICATED, "Invalid or expired token", 401));
  }
}

function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.auth) return next(new AppError(codes.UNAUTHENTICATED, "Authentication required", 401));
    if (!roles.includes(req.auth.role)) {
      return next(new AppError(codes.FORBIDDEN, "Insufficient role", 403));
    }
    next();
  };
}

function requireActiveUser(req, _res, next) {
  if (!req.auth) return next(new AppError(codes.UNAUTHENTICATED, "Authentication required", 401));
  if (req.auth.status !== "active") {
    return next(new AppError(codes.FORBIDDEN, "Account is not active", 403));
  }
  next();
}

function requireVerifiedEmail(req, _res, next) {
  if (!req.user?.email_verified_at) {
    return next(new AppError(codes.FORBIDDEN, "Email verification required", 403));
  }
  next();
}

module.exports = { authenticate, requireRoles, requireActiveUser, requireVerifiedEmail };
