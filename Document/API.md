# FiFB / GR Backend API

## Overview

Base URL: `/api`

The backend is the authority for authentication, authorization, validation, business rules, notifications, audit logs, and database writes. The future frontend must call these APIs only. Protected APIs derive identity from the access token and never trust frontend-sent `user_id`.

The API matches the existing Supabase schema from `Document/DatabaseSQL.txt`. It does not require token tables, `email_deliveries`, or exercise library views.

## Auth And Tokens

Custom backend auth issues JWT access tokens and opaque refresh tokens.

- `app_users.password_hash` stores bcrypt password hashes.
- Refresh/session/reset/verification token hashes are stored in Redis when enabled.
- If `REDIS_DISABLED=true`, the backend uses an in-memory fallback for local development only.
- Raw tokens are never stored.
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
| POST   | `/auth/verify-email`           | Guest         | Verify email token and activate account.                |
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
  "fullName": "Demo User"
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
