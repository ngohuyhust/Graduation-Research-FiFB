const authService = require("./auth.service");
const { publicUser } = require("../users/users.presenter");
const { sendSuccess, sendCreated, sendNoContent } = require("../../utils/responses");

function meta(req) {
  return { ipAddress: req.ip, userAgent: req.get("user-agent") };
}

async function register(req, res) {
  const result = await authService.register(req.body, meta(req));
  return sendCreated(res, { user: publicUser(result.user) }, "Registration created. Check email to verify account.");
}

async function login(req, res) {
  const tokens = await authService.login(req.body, meta(req));
  return sendSuccess(res, tokens, "Logged in");
}

async function refresh(req, res) {
  const tokens = await authService.refresh(req.body.refreshToken, meta(req));
  return sendSuccess(res, tokens, "Token refreshed");
}

async function logout(req, res) {
  await authService.logout(req.body.refreshToken);
  return sendNoContent(res);
}

async function me(req, res) {
  return sendSuccess(res, { user: publicUser(req.user) });
}

async function verifyEmail(req, res) {
  const result = await authService.verifyEmail(req.body.token);
  return sendSuccess(res, { user: publicUser(result.user) }, "Email verified");
}

async function requestPasswordReset(req, res) {
  await authService.requestPasswordReset(req.body.email);
  return sendSuccess(res, null, "If the email exists, a reset link has been sent");
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  return sendNoContent(res);
}

async function changePassword(req, res) {
  await authService.changePassword(req.auth.userId, req.body.currentPassword, req.body.newPassword);
  return sendNoContent(res);
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
};
