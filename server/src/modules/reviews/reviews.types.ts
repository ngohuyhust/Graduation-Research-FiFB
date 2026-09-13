export interface ReviewRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  trainer_id: string;
  rating: number;
  comment: string | null;
  status: string;
}
