export interface ExerciseRow extends Record<string, unknown> {
  id: string;
  name: string;
  status: string;
  created_by: string | null;
  external_id?: string | null;
  source?: string;
  gif_url?: string | null;
  instructions?: string[];
  reviewed_by?: string | null;
  reviewed_at?: Date | string | null;
  rejection_reason?: string | null;
  body_parts?: { id: string; name: string }[];
  equipments?: { id: string; name: string }[];
  target_muscles?: { id: string; name: string }[];
  secondary_muscles?: { id: string; name: string }[];
  created_at?: Date | string;
  updated_at?: Date | string;
}
