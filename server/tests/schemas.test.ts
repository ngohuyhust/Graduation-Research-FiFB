// Kiem thu tu dong cho schemas.
const authSchemas = require("../src/modules/auth/auth.validation");
const exerciseValidation = require("../src/modules/exercises/exercises.validation");
const reviewsValidation = require("../src/modules/reviews/reviews.validation");
const workoutPlansValidation = require("../src/modules/workoutPlans/workoutPlans.validation");

describe("request schemas", () => {
  test("register requires a strong enough password", () => {
    const parsed = authSchemas.registerSchema.safeParse({
      email: "demo@example.com",
      password: "short",
      phone: "0900000000",
    });
    expect(parsed.success).toBe(false);
  });

  test("register requires phone", () => {
    const parsed = authSchemas.registerSchema.safeParse({
      email: "demo@example.com",
      password: "password123",
    });
    expect(parsed.success).toBe(false);
  });

  test("email verification requires a 6 digit OTP", () => {
    expect(authSchemas.verifyEmailSchema.safeParse({ email: "demo@example.com", otp: "123456" }).success).toBe(true);
    expect(authSchemas.verifyEmailSchema.safeParse({ email: "demo@example.com", otp: "12345" }).success).toBe(false);
  });

  test("certificate rejection requires reason", () => {
    const parsed = exerciseValidation.reviewDecisionSchema.safeParse({ status: "rejected" });
    expect(parsed.success).toBe(false);
  });

  test("rating is constrained to 1 through 5", () => {
    expect(reviewsValidation.reviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(reviewsValidation.reviewSchema.safeParse({ rating: 5 }).success).toBe(true);
  });

  test("workout items require positive order fields", () => {
    const parsed = workoutPlansValidation.workoutPlanSchema.safeParse({
      title: "Plan",
      items: [{ exerciseId: "6ce85d13-eec0-4aa3-9b8f-905fa1fcd8fb", dayNumber: 1, sortOrder: 0 }],
    });
    expect(parsed.success).toBe(false);
  });

  test("admin user status schema accepts every app_users status", () => {
    for (const status of ["active", "locked", "disabled", "pending_verification"]) {
      expect(authSchemas.registerSchema.shape.role.safeParse("admin").success).toBe(false);
      const usersValidation = require("../src/modules/users/users.validation");
      expect(usersValidation.statusSchema.safeParse({ status }).success).toBe(true);
    }
  });
});

export {};
