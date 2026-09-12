// Khai bao schema validate input cho module auth.
import { z } from "zod";

const password = z.string().min(8).max(128);
const fitnessGoal = z.enum(["lose_weight", "gain_muscle", "increase_strength"]);
const gender = z.enum(["male", "female"]);

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password,
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().trim().min(1).max(40),
  role: z.enum(["user", "trainer"]).default("user"),
  fitnessGoal: fitnessGoal.optional(),
  gender,
  weight: z.number().positive().max(500).optional(),
  height: z.number().positive().max(300).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({});
export const logoutSchema = refreshSchema;
export const verifyEmailSchema = z.object({
  email: z.string().trim().email().max(320),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});
export const requestPasswordResetSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ token: z.string().min(20), newPassword: password });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });

export type RegisterPayload = z.infer<typeof registerSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;
export type VerifyEmailPayload = z.infer<typeof verifyEmailSchema>;
export type RequestPasswordResetPayload = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordPayload = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;
