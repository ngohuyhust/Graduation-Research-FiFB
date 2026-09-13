export interface TrainerProfileRow extends Record<string, unknown> {
  trainer_id: string;
  bio: string | null;
  specialization: string | null;
  years_of_experience: number;
  is_verified: boolean;
  verified_at: Date | string | null;
  verified_by: string | null;
}
