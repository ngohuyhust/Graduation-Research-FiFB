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
