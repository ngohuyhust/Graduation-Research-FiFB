// Tao va kiem tra access token JWT cho nguoi dung.
const jwt = require("jsonwebtoken");
const { env } = require("../../config/env");

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      status: user.status,
    },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpiresIn },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

module.exports = { signAccessToken, verifyAccessToken };
