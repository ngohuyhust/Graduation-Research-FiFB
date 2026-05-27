-- Optional fresh-local scaffold matching Document/DatabaseSQL.txt.
-- Do not run against an existing Supabase database that was already created
-- from Document/DatabaseSQL.txt.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'trainer'::text, 'admin'::text])),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'locked'::text, 'disabled'::text, 'pending_verification'::text])),
  email_verified_at timestamp with time zone,
  last_login_at timestamp with time zone,
  password_changed_at timestamp with time zone,
  fitness_goal text,
  experience_level text CHECK (experience_level IS NULL OR (experience_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT app_users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.app_users(id)
);

CREATE TABLE IF NOT EXISTS public.body_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT body_parts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.equipments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT equipments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.muscles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT muscles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  source text NOT NULL DEFAULT 'exercisedb_v1'::text CHECK (source = ANY (ARRAY['exercisedb_v1'::text, 'admin'::text, 'trainer_submission'::text])),
  name text NOT NULL,
  gif_url text,
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(instructions) = 'array'::text),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'inactive'::text, 'rejected'::text])),
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(raw_data) = 'object'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exercises_pkey PRIMARY KEY (id),
  CONSTRAINT exercises_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id),
  CONSTRAINT exercises_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.app_users(id)
);

CREATE TABLE IF NOT EXISTS public.exercise_body_parts (
  exercise_id uuid NOT NULL,
  body_part_id uuid NOT NULL,
  CONSTRAINT exercise_body_parts_pkey PRIMARY KEY (exercise_id, body_part_id),
  CONSTRAINT exercise_body_parts_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id),
  CONSTRAINT exercise_body_parts_body_part_id_fkey FOREIGN KEY (body_part_id) REFERENCES public.body_parts(id)
);

CREATE TABLE IF NOT EXISTS public.exercise_equipments (
  exercise_id uuid NOT NULL,
  equipment_id uuid NOT NULL,
  CONSTRAINT exercise_equipments_pkey PRIMARY KEY (exercise_id, equipment_id),
  CONSTRAINT exercise_equipments_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id),
  CONSTRAINT exercise_equipments_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipments(id)
);

CREATE TABLE IF NOT EXISTS public.exercise_muscles (
  exercise_id uuid NOT NULL,
  muscle_id uuid NOT NULL,
  muscle_role text NOT NULL CHECK (muscle_role = ANY (ARRAY['target'::text, 'secondary'::text])),
  CONSTRAINT exercise_muscles_pkey PRIMARY KEY (exercise_id, muscle_id, muscle_role),
  CONSTRAINT exercise_muscles_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id),
  CONSTRAINT exercise_muscles_muscle_id_fkey FOREIGN KEY (muscle_id) REFERENCES public.muscles(id)
);

CREATE TABLE IF NOT EXISTS public.favorite_exercises (
  user_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT favorite_exercises_pkey PRIMARY KEY (user_id, exercise_id),
  CONSTRAINT favorite_exercises_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id),
  CONSTRAINT favorite_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id)
);

CREATE TABLE IF NOT EXISTS public.trainer_profiles (
  trainer_id uuid NOT NULL,
  bio text,
  specialization text,
  years_of_experience integer NOT NULL DEFAULT 0 CHECK (years_of_experience >= 0),
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamp with time zone,
  verified_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trainer_profiles_pkey PRIMARY KEY (trainer_id),
  CONSTRAINT trainer_profiles_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.app_users(id),
  CONSTRAINT trainer_profiles_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.app_users(id)
);

CREATE TABLE IF NOT EXISTS public.trainer_certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  title text NOT NULL,
  issuer text,
  certificate_url text,
  certificate_number text,
  verification_url text,
  issued_at date,
  expires_at date,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trainer_certificates_pkey PRIMARY KEY (id),
  CONSTRAINT trainer_certificates_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainer_profiles(trainer_id),
  CONSTRAINT trainer_certificates_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.app_users(id)
);

CREATE TABLE IF NOT EXISTS public.trainer_connection_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trainer_id uuid NOT NULL,
  goal_snapshot text,
  message text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])),
  reject_reason text,
  responded_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trainer_connection_requests_pkey PRIMARY KEY (id),
  CONSTRAINT trainer_connection_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id),
  CONSTRAINT trainer_connection_requests_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainer_profiles(trainer_id)
);

CREATE TABLE IF NOT EXISTS public.user_trainer_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trainer_id uuid NOT NULL,
  request_id uuid UNIQUE,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'ended'::text])),
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_trainer_connections_pkey PRIMARY KEY (id),
  CONSTRAINT user_trainer_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id),
  CONSTRAINT user_trainer_connections_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainer_profiles(trainer_id),
  CONSTRAINT user_trainer_connections_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.trainer_connection_requests(id)
);

CREATE TABLE IF NOT EXISTS public.trainer_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  status text NOT NULL DEFAULT 'visible'::text CHECK (status = ANY (ARRAY['visible'::text, 'hidden'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trainer_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT trainer_reviews_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainer_profiles(trainer_id),
  CONSTRAINT trainer_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id)
);

CREATE TABLE IF NOT EXISTS public.workout_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  created_by uuid,
  title text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'private'::text CHECK (visibility = ANY (ARRAY['private'::text, 'trainer_visible'::text, 'public'::text])),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'archived'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workout_plans_pkey PRIMARY KEY (id),
  CONSTRAINT workout_plans_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.app_users(id),
  CONSTRAINT workout_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id)
);

CREATE TABLE IF NOT EXISTS public.workout_plan_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workout_plan_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  day_number integer NOT NULL DEFAULT 1 CHECK (day_number > 0),
  sort_order integer NOT NULL DEFAULT 1 CHECK (sort_order > 0),
  sets integer CHECK (sets IS NULL OR sets > 0),
  reps integer CHECK (reps IS NULL OR reps > 0),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  rest_seconds integer CHECK (rest_seconds IS NULL OR rest_seconds >= 0),
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workout_plan_items_pkey PRIMARY KEY (id),
  CONSTRAINT workout_plan_items_workout_plan_id_fkey FOREIGN KEY (workout_plan_id) REFERENCES public.workout_plans(id),
  CONSTRAINT workout_plan_items_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  content text,
  action_url text,
  is_important boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'::text),
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.app_users(id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.app_users(id)
);
