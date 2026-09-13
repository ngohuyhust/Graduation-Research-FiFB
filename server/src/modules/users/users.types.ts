import type { UpdateProfile, UserStatus } from "./users.validation";

type Timestamp = Date | string;
export type UserRole = "user" | "trainer" | "admin";

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  email_verified_at: Timestamp | null;
  last_login_at: Timestamp | null;
  password_changed_at: Timestamp | null;
  fitness_goal: UpdateProfile["fitnessGoal"] | null;
  experience_level: UpdateProfile["experienceLevel"] | null;
  gender: UpdateProfile["gender"] | null;
  weight: number | string | null;
  height: number | string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PasswordUserRow extends UserRow {
  password_hash: string;
}

export type CreateUser = UpdateProfile & {
  email: string;
  phone: string;
  passwordHash: string;
  role?: UserRole;
  status: UserStatus;
};
