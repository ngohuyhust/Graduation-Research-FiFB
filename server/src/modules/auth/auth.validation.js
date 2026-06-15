const { z } = require("zod");

const password = z.string().min(8).max(128);

const registerSchema = z.object({
  email: z.string().email().max(320),
  password,
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().trim().min(1).max(40),
  role: z.enum(["user", "trainer"]).default("user"),
  fitnessGoal: z.string().max(500).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({ refreshToken: z.string().min(20) });
const logoutSchema = refreshSchema;
const verifyEmailSchema = z.object({
  email: z.string().trim().email().max(320),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});
const requestPasswordResetSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({ token: z.string().min(20), newPassword: password });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
