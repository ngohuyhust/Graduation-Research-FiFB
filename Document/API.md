# FiFB / GR Backend API

## Overview

Base URL for Flutter: `/api/v1`. Legacy `/api` remains available for React during the transition.

Swagger UI: `/api/docs`. Machine-readable OpenAPI: `/api/openapi.json`.
The paths below use the legacy prefix; replace `/api` with `/api/v1` for version 1.
Both prefixes share validation, access control, envelopes and authentication rate limits.
Unknown versions return 404. OpenAPI request schemas come from runtime Zod validators;
endpoint-specific response data schemas remain untyped.

The backend is the authority for authentication, authorization, validation, business rules, notifications, audit logs, and database writes. The future frontend must call these APIs only. Protected APIs derive identity from the access token and never trust frontend-sent `user_id`.

Flyway migrations in `server/flyway/sql` define the executable schema. `Document/DatabaseSQL-v2.txt`
is a reference snapshot. V2 makes gender, height and weight optional without fabricating values
when omitted, while preserving existing measurements. It does not require token tables,
`email_deliveries`, or exercise library views.

## Auth And Tokens

Custom backend auth issues JWT access tokens and opaque refresh tokens.

Browser refresh tokens use the HTTP-only `fifb_refresh_token` cookie, scoped to `/api/auth`
for legacy login or `/api/v1/auth` for version 1. Refresh reads the cookie and rotates it;
logout revokes the session and clears the cookie at the matching path. The response JSON
contains the access token, not the refresh token.

Native Flutter clients use these version-1-only endpoints (no browser cookies):

- `POST /api/v1/auth/mobile/login`: `{ email, password }`; returns
  `{ accessToken, refreshToken, expiresAt }` in the success envelope.
- `POST /api/v1/auth/mobile/refresh`: `{ refreshToken }`; rotates the refresh token
  and returns the new token pair. `expiresAt` is the refresh-session expiry.
- `POST /api/v1/auth/mobile/logout`: `{ refreshToken }`; revokes that session and returns 204.

Token responses include `Cache-Control: no-store`. Mobile login shares the existing
authentication rate limit. Native clients store only refresh tokens in OS secure
storage and use access tokens in the Authorization header. Registration, verification,
password reset and `/auth/me` are shared with Web. Device listing and per-device
management are follow-up work.

- `app_users.password_hash` stores bcrypt password hashes.
- Refresh/session/reset token hashes and email verification OTP hashes are stored in Redis when enabled.
- If `REDIS_DISABLED=true`, the backend uses an in-memory fallback for local development only.
- Raw tokens and OTPs are never stored.
- Register creates `status = pending_verification`, sends SMTP verification email, and activates the account after verification.

Use access tokens as:

```http
Authorization: Bearer <accessToken>
```

## Roles

- Guest: browse active exercises and public trainer/review data.
- User: profile, favorites, workout plans, trainer connection requests, trainer reviews after connection.
- Trainer: user capabilities plus trainer profile, certificates, incoming requests, and exercise submissions.
- Admin: user management, exercise moderation, certificate moderation, audit logs.

## Standard Response

```json
{ "success": true, "data": {}, "message": "OK" }
```

## Standard Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {}
  }
}
```

## Pagination

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 0,
  "totalPages": 0
}
```

## Auth

| Method | URL                            | Role          | Description                                             |
| ------ | ------------------------------ | ------------- | ------------------------------------------------------- |
| POST   | `/auth/register`               | Guest         | Register `user` or `trainer`; sends verification email. |
| POST   | `/auth/verify-email`           | Guest         | Verify 6-digit email OTP and activate account.          |
| POST   | `/auth/login`                  | Guest         | Login active verified user.                             |
| POST   | `/auth/refresh`                | Guest         | Rotate refresh token and return new tokens.             |
| POST   | `/auth/logout`                 | Guest         | Revoke refresh token.                                   |
| GET    | `/auth/me`                     | Authenticated | Return current user.                                    |
| POST   | `/auth/change-password`        | Authenticated | Change password and revoke sessions.                    |
| POST   | `/auth/request-password-reset` | Guest         | Send reset email if account exists.                     |
| POST   | `/auth/reset-password`         | Guest         | Reset password by token.                                |

Register body:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "user",
  "fullName": "Demo User",
  "phone": "0900000000"
}
```

Verify email body:

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

## Users

| Method | URL                 | Role          | Description                                                               |
| ------ | ------------------- | ------------- | ------------------------------------------------------------------------- |
| GET    | `/users/me`         | Authenticated | Get own profile.                                                          |
| PATCH  | `/users/me`         | Authenticated | Update own profile fields.                                                |
| GET    | `/users`            | Admin         | List users with `page`, `limit`, `role`, `status`, `keyword`.             |
| GET    | `/users/:id`        | Admin         | Get one user.                                                             |
| PATCH  | `/users/:id/status` | Admin         | Set `active`, `locked`, or `disabled`; writes audit log and notification. |

## Trainers

| Method | URL                         | Role    | Description                                                  |
| ------ | --------------------------- | ------- | ------------------------------------------------------------ |
| GET    | `/trainers`                 | Guest   | List active trainers; filters: `specialization`, `verified`. |
| GET    | `/trainers/:id`             | Guest   | Get public trainer profile.                                  |
| PUT    | `/trainers/me/profile`      | Trainer | Create/update own trainer profile.                           |
| POST   | `/trainers/me/certificates` | Trainer | Submit certificate metadata.                                 |
| GET    | `/trainers/me/certificates` | Trainer | List own certificates.                                       |
| GET    | `/trainers/me/requests`     | Trainer | List incoming connection requests.                           |
| GET    | `/trainers/me/connections`  | Trainer | List own trainer connections.                                |
| POST   | `/trainers/me/exercises`    | Trainer | Submit pending exercise.                                     |

## Trainer Connections

| Method | URL                                        | Role          | Description                                                    |
| ------ | ------------------------------------------ | ------------- | -------------------------------------------------------------- |
| POST   | `/trainer-connection-requests`             | User/Trainer  | Send connection request to trainer.                            |
| GET    | `/trainer-connection-requests`             | User/Trainer  | List own outgoing or incoming requests.                        |
| GET    | `/trainer-connection-requests/connections` | User/Trainer  | List own current/historical connections.                       |
| PATCH  | `/trainer-connection-requests/:id/cancel`  | Request owner | Cancel pending request.                                        |
| PATCH  | `/trainer-connection-requests/:id/approve` | Trainer       | Approve pending request and create `user_trainer_connections`. |
| PATCH  | `/trainer-connection-requests/:id/reject`  | Trainer       | Reject pending request with `rejectReason`.                    |

## Exercises

| Method | URL                               | Role  | Description                            |
| ------ | --------------------------------- | ----- | -------------------------------------- |
| GET    | `/exercises`                      | Guest | List active exercises.                 |
| GET    | `/exercises/:id`                  | Guest | Get active exercise detail.            |
| POST   | `/exercises`                      | Admin | Create admin exercise.                 |
| PATCH  | `/exercises/:id`                  | Admin | Update exercise and taxonomy mappings. |
| GET    | `/admin/exercises`                | Admin | List all exercise statuses.            |
| PATCH  | `/admin/exercises/:id/review`     | Admin | Approve/reject submitted exercise.     |
| PATCH  | `/admin/exercises/:id/deactivate` | Admin | Set exercise `inactive`.               |

Exercise filters: `keyword`, `bodyPart`, `equipment`, `targetMuscle`, `secondaryMuscle`, `page`, `limit`.

## Exercise Taxonomy

| Method | URL                             | Role  | Description                              |
| ------ | ------------------------------- | ----- | ---------------------------------------- |
| GET    | `/exercise-taxonomy/bodyParts`  | Guest | List body parts.                         |
| GET    | `/exercise-taxonomy/equipments` | Guest | List equipment.                          |
| GET    | `/exercise-taxonomy/muscles`    | Guest | List muscles.                            |
| POST   | same URLs                       | Admin | Create or return existing taxonomy item. |

## Favorites

| Method | URL              | Role         | Description                         |
| ------ | ---------------- | ------------ | ----------------------------------- |
| GET    | `/favorites`     | User/Trainer | List own favorite active exercises. |
| POST   | `/favorites`     | User/Trainer | Add `{ "exerciseId": "uuid" }`.     |
| DELETE | `/favorites/:id` | User/Trainer | Remove by exercise id.              |

## Workout Plans

| Method | URL                  | Role          | Description                      |
| ------ | -------------------- | ------------- | -------------------------------- |
| GET    | `/workout-plans`     | Authenticated | List own plans.                  |
| POST   | `/workout-plans`     | Authenticated | Create plan with optional items. |
| GET    | `/workout-plans/:id` | Owner         | Get detail and ordered items.    |
| PATCH  | `/workout-plans/:id` | Owner         | Update fields or replace items.  |
| DELETE | `/workout-plans/:id` | Owner         | Archive plan.                    |

Item order is returned by `day_number`, then `sort_order`.

## Reviews

| Method | URL                     | Role         | Description                                  |
| ------ | ----------------------- | ------------ | -------------------------------------------- |
| POST   | `/trainers/:id/reviews` | User/Trainer | Create/update review after valid connection. |
| GET    | `/trainers/:id/reviews` | Guest        | List visible trainer reviews.                |

Rating must be 1 to 5.

## Notifications

| Method | URL                       | Role          | Description                      |
| ------ | ------------------------- | ------------- | -------------------------------- |
| GET    | `/notifications`          | Authenticated | List own notifications.          |
| PATCH  | `/notifications/:id/read` | Owner         | Mark one notification read.      |
| PATCH  | `/notifications/read-all` | Owner         | Mark all own notifications read. |

Only important backend events create database notifications.

## Admin And Audit

| Method | URL                               | Role  | Description                                                  |
| ------ | --------------------------------- | ----- | ------------------------------------------------------------ |
| GET    | `/admin/users`                    | Admin | List users.                                                  |
| PATCH  | `/admin/users/:id/status`         | Admin | Lock/unlock/disable user.                                    |
| GET    | `/admin/certificates`             | Admin | List certificates.                                           |
| PATCH  | `/admin/certificates/:id/review`  | Admin | Approve/reject certificate.                                  |
| GET    | `/admin/exercises`                | Admin | List exercises.                                              |
| PATCH  | `/admin/exercises/:id/review`     | Admin | Approve/reject exercise.                                     |
| PATCH  | `/admin/exercises/:id/deactivate` | Admin | Deactivate exercise.                                         |
| GET    | `/admin/audit-logs`               | Admin | List audit logs; filters: `action`, `entityType`, `actorId`. |
| GET    | `/admin/email-deliveries`         | Admin | Runtime-only SMTP delivery attempts from current process.    |
## Training profile (Flutter onboarding)

`GET /api/v1/users/me/training-profile` returns `{ profile: null }` before onboarding, otherwise the saved profile. `PUT` fully replaces the authenticated User's profile; Admin and Trainer accounts cannot access it. Both responses use the standard success envelope and `Cache-Control: no-store`.

Required JSON fields: `goal` (`general_fitness`, `build_muscle`, `lose_fat`, `strength`), `experienceLevel` (`beginner`, `intermediate`, `advanced`), `daysPerWeek` (1–7), `sessionMinutes` (15–180), `location` (`home`, `gym`, `both`), `equipmentIds`, `priorityMuscleIds`, `dislikedExerciseIds` (unique UUID arrays, at most 100 each), and `limitations` (at most 1000 characters; empty is allowed). Empty selections are valid. Taxonomy IDs must exist; new disliked exercises must be active; previously excluded retired exercises may be retained. Saves are atomic; `completedAt` records the first successful save and `updatedAt` the latest. Apply Flyway V3 before using these endpoints. These preferences are inputs for the later recommendation milestone, not a generated program.

## Flutter exercise discovery addition

`GET /api/v1/favorites/:id` returns `{ success: true, data: { isFavorite: boolean }, message: "OK" }`.
The UUID is an exercise ID. Authentication, active/verified account checks and
the existing User/Trainer role restriction apply. Status is scoped to the caller;
no user ID is accepted. An unknown or unsaved exercise returns `false`.
Existing list/add/remove endpoints are unchanged. The route is also available at
the legacy `/api/favorites/:id` path and appears in generated OpenAPI.

Flutter Explore uses the existing taxonomy paths `bodyParts`, `equipments`, and
`muscles`. Exercise filters take names; pagination uses `page`, `limit`, `total`,
and `totalPages`. Muscle-role conditions are evaluated within their SQL subqueries.

## Workout plans and Today Workout (V4)

Apply `V4__workout_plan_schedule.sql` before running this backend version. Existing
plans receive an empty schedule and keep their items, visibility and status.

Plan creation/update accepts optional `schedule: [{ weekday: 1, dayNumber: 2 }]`.
Weekdays are ISO Monday=1 through Sunday=7. Each plan permits at most one workout
day per weekday, and that numbered day must contain at least one exercise. A day
may repeat on several weekdays. Different active plans may share a weekday; all
are returned rather than silently choosing a plan. Omission during PATCH retains
the schedule; `[]` clears it. Item edits that would invalidate a retained schedule
roll back atomically. Send the revised schedule with the edited items.

`GET /api/v1/workout-plans/today?weekday=1` requires the caller's local weekday,
returns `{ items: [{ planId, title, dayNumber, items }] }` in the standard envelope,
and includes only active plans owned by the caller. It is a weekly plan preview,
not session completion history or automatic progression. There is no server-timezone
assumption. Flutter sends the device-local weekday, displays the date loaded, and
refreshes on app resume or explicit refresh.

Plan detail and Today item rows retain existing snake_case fields and add
`exercise_name` and `exercise_status`. Retired exercises remain visible with an
unavailable state. New/replaced item lists still require active exercises. The
editor asks users to remove or replace unavailable exercises before saving.
Descriptions may now be `""` to clear them; omission preserves existing text.
Flutter creates private plans and omits visibility when editing existing plans.
Archive/restore changes status without deleting items or schedules. Plan CRUD,
Today and archive all derive ownership from authentication, including Admin callers.

## Live workout sessions (V5)

Apply `V5__durable_workout_sessions.sql` before running this version.

- `POST /api/v1/workout-sessions` additionally accepts `dayNumber` (requires an
  owned active `workoutPlanId`) and optional UUID `clientOperationId`. New sessions
  snapshot the selected plan day, including exercise names and targets. Omitting
  the day retains legacy whole-plan behavior. The same owner/key/payload returns
  the original session; using that key with a different payload returns 409.
- `POST /api/v1/workout-sessions/:id/logs` accepts optional UUID
  `clientOperationId` and `restEndsAt` (UTC ISO timestamp or null). The same
  session/key/payload returns the original set without inserting a duplicate or
  restarting the timer, even after completion. A different payload conflicts.
- `PUT /api/v1/workout-sessions/:id/logs/:logId` replaces set number, reps,
  weight, duration and note on an unfinished owned session. Exercise identity
  cannot be changed through this endpoint. Omitted measurements clear them.
- `DELETE /api/v1/workout-sessions/:id/logs/:logId` soft-deletes a set on an
  unfinished owned session. Repeated deletion is safe. Deleted sets are excluded
  from details, history counts, previous results and statistics. Retry tombstones
  prevent an old POST from recreating a deleted set.
- `PATCH /api/v1/workout-sessions/:id` accepts `paused` and `restEndsAt` in
  addition to existing fields. Completion clears pause/rest state. Repeating
  completion is safe; other changes and set mutations cannot edit a finished
  session. The Flutter pause action clears the rest timer.
- `GET /api/v1/workout-sessions/:id/previous?exerciseId=UUID` returns `{ items }`
  containing sets from the caller's most recent workout completed before this
  session started. Empty results mean no preceding completed workout is known.

Mutations lock the owned session row to serialize set writes and completion.
Creation keys are scoped to the account; set keys are scoped to the session.
Keys are optional for legacy clients, so duplicate prevention requires callers to
send and retain them. These are retry guarantees, not conflict resolution for
simultaneous editing from multiple devices.

V5 freezes the current full plan for older sessions, whose selected day was never
recorded. It cannot reconstruct plan versions lost before migration. New selected-day
sessions use immutable snapshots. Existing response field names remain snake_case.

Flutter keeps cached session data and one pending submitted mutation under keys
scoped to the signed-in account using the secure-storage plugin. Requests are
persisted before sending. Retry reuses the exact body/key; new changes are blocked
until the pending operation is confirmed. Definitively rejected changes may be
discarded explicitly. An uncertain network failure cannot be silently discarded.
This is not a complete offline queue: initial start needs the server. Unsubmitted
set forms now save local draft text per account/session/exercise/set; reopening
the same form restores it. Submission persists the exact pending request before
removing its draft; interrupted cleanup is repeated before replay. Draft metadata
stays on the client and does not change the API payload. Cached data is not shown after
401/403/404 responses. Native secure storage and Web browser persistence still
require device/browser smoke tests (Web secure storage requires a secure context).
