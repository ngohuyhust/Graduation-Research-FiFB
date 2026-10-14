# FiFB

FiFB is a fitness platform built with NestJS, PostgreSQL, Redis, Socket.IO, React, Vite, and Tailwind CSS.
This upgrade intentionally excludes chatbot and AI features.

## Features

- JWT authentication, email verification, roles, trainers, certificates, reviews, and connections
- Exercise library, taxonomy, favorites, and workout plans
- Workout tracking with set/rep/weight logs, volume, streaks, and exercise progression
- Persistent trainer-user chat with REST fallback and Socket.IO events
- Real-time notifications and unread badge
- Redis/Upstash response caching and distributed rate limiting
- Docker, Render blueprint, and GitHub Actions workflows

## Architecture

```mermaid
flowchart LR
  Client[React + Vite] -->|REST / JWT| API[NestJS + Express API]
  Client <-->|Socket.IO| Socket[Realtime layer]
  API --> DB[(PostgreSQL)]
  API --> Redis[(Redis / Upstash)]
  Socket --> API
  API --> Email[SendGrid]
```

The application code lives in:

```text
server/
client/
```

All business modules use NestJS 11 and TypeScript, including their repositories, validation schemas,
auth token provider and refresh-cookie helpers. Controllers, services and repositories use Nest
dependency injection. Nest owns all `/api` routes, including `/api/health`; Express 4 remains the
HTTP adapter with shared CORS, security headers, parsing, logging and rate limits.

| Module | Routes / responsibility |
| --- | --- |
| `AuthModule` | `/api/auth`, credentials, verification/reset tokens, refresh sessions and cookies |
| `UsersModule`, `AdminModule` | `/api/users`, `/api/admin`, user administration and delegation to business services |
| `ExercisesModule`, `ExerciseTaxonomyModule` | `/api/exercises`, `/api/admin/exercises`, `/api/exercise-taxonomy` |
| `TrainersModule`, `TrainerCertificatesModule`, `TrainerConnectionsModule`, `ReviewsModule` | Trainer profiles, certificates, connection requests and reviews |
| `FavoritesModule` | `/api/favorites` |
| `WorkoutPlansModule`, `WorkoutSessionsModule` | `/api/workout-plans`, `/api/workout-sessions`, logs, statistics and progression |
| `ChatModule` | `/api/chat`; Socket.IO handlers receive the same Nest `ChatService` instance |
| `NotificationsModule` | `/api/notifications` and shared transactional notification creation |
| `AuditModule`, `EmailDeliveriesModule` | Shared audit/mail providers; administration routes live in `AdminController` |

`UsersRepository` and `JwtService` are shared by HTTP authentication and Socket.IO. Admin delegates
to the owning business services and has no separate repository. Guards, Zod pipes, exception handling
and cache interceptors preserve existing URLs, permissions, status codes and response envelopes.
Database transactions use the injected `DatabaseService`. Auth storage still uses Redis with the
existing non-production memory fallback; email-delivery history remains process-local.

### Phase 1: backend foundation (weeks 1–2)

Flutter clients use `/api/v1`. Existing `/api` routes continue to serve the React client during
the transition. Both use the same controllers, validation, permissions, response envelopes,
and shared authentication rate limit. Unsupported versions return the standard 404 envelope.

- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`
- Versioned health: `http://localhost:4000/api/v1/health`

OpenAPI derives request bodies, query filters, defaults and path parameters from the existing
Zod validators. It documents bearer authentication, refresh cookies, roles and response envelopes.
Endpoint-specific response `data` is still described by the existing API contract rather than
fully typed OpenAPI schemas. Field names retain the current contract during the migration.
Browser refresh cookies are scoped to `/api/auth` or `/api/v1/auth` according to the login route.
Flutter device sessions and secure token storage are subsequent authentication work.

Backend source, CLI scripts, Jest tests and tooling configuration are TypeScript. `npm run build`
produces `server/dist/server.js` and compiled commands under `server/dist/scripts/`;
`npm run typecheck` checks application and tests. The client continues to use React.
After direct exercise data cleanup, run `node dist/scripts/data_quality/clear_exercise_cache.js`
from `server/` (or inside the API container) to clear the exercise library cache.

The backend keeps the existing module pattern:

```text
controller -> service -> repository -> PostgreSQL
                  |
                  +-> Redis / Socket.IO
```

## Local Setup

Requirements: Node.js 20+, PostgreSQL, Docker (for Flyway), and optionally Redis.

```powershell
cd server
npm.cmd install
Copy-Item .env.example .env

cd ..\client
npm.cmd install
Copy-Item .env.example .env
```

Edit `server/.env`:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN` (`http://localhost:5173,http://localhost:3000` for local native + Docker Compose frontend)
- SendGrid values if using email verification/password reset
- Redis or Upstash values if `REDIS_DISABLED=false`

PowerShell blocks `npm.ps1` on this machine, so use `npm.cmd`.

### Database migrations (Flyway)

Docker Compose runs the official Flyway image directly. All current tables, constraints and
indexes are in one migration: server/flyway/sql/V1__initial_schema.sql.
V2 (`V2__optional_body_measurements.sql`) makes gender, height and weight nullable and removes
their defaults. Registration may omit these fields. Existing values are preserved, because
historical defaults cannot reliably be distinguished from values the user entered.
The target is public, configured in server/flyway/flyway.conf. The existing cloud schema
has been adopted at baseline V1 after filling its missing V1 tables and indexes.

Copy server/flyway/.env.example to server/flyway/.env and fill in the native Flyway settings:

~~~dotenv
FLYWAY_URL=jdbc:postgresql://HOST:5432/postgres?sslmode=require
FLYWAY_USER=postgres.PROJECT_REF
FLYWAY_PASSWORD='YOUR_DATABASE_PASSWORD'
~~~

For Supabase, use the Session pooler connection from the Connect panel (port 5432).
The password is literal, not URL-encoded, because it is a separate setting. Keep this file local;
Git ignores it. The API continues to use server/.env; migration credentials are separate.

From the repository root, start Flyway:

~~~powershell
docker compose up flyway
~~~

The container checks public.flyway_schema_history and applies pending migrations, then exits
with code 0. V1 is already baselined on the existing cloud database, so its CREATE statements
are skipped. A new empty schema executes V1 normally. A successful migration container is
expected to stop; it is not a web service. No npm build or custom migration scripts are needed.

~~~powershell
docker compose run --rm flyway info
docker compose run --rm flyway validate
~~~

All application objects and foreign keys are created in the selected schema. To run against
the existing isolated test schema instead of public, override both schema settings:

~~~powershell
docker compose run --rm flyway -schemas=fifb_test -defaultSchema=fifb_test migrate
~~~

The test schema reuses existing citext and pg_trgm extensions and stops if they are missing;
it does not install or move shared extensions. The API reads public.

For another existing database, first compare its schema with V1 and fill any missing objects,
then adopt it with a one-time baseline. This records version 1 without executing the CREATE statements:

~~~powershell
docker compose run --rm flyway -schemas=public -defaultSchema=public baseline
~~~

Do not baseline an empty schema. Automatic baseline and clean are disabled.

For future changes, add V2__description.sql, then V3__description.sql, and run
docker compose up flyway. Use the same default-schema placeholder as V1 for all objects.
Leave applied migrations unchanged. Flyway validates checksums, not live structural drift.
Document/DatabaseSQL-v2.txt is a reference snapshot; V1 is the executable initial schema.

Run both applications:

```powershell
# Terminal 1
cd server
npm.cmd run dev

# Terminal 2
cd client
npm.cmd run dev
```

- Native frontend: `http://localhost:5173`
- Docker Compose frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api` by default, or the port configured by `server/.env` `PORT`
- Health: `http://localhost:4000/api/health`
- Flutter REST API: `http://localhost:4000/api/v1`

## New API Endpoints

Workout sessions:

- `POST /api/workout-sessions`
- `GET /api/workout-sessions`
- `GET /api/workout-sessions/stats`
- `GET /api/workout-sessions/progression/:exerciseId`
- `GET /api/workout-sessions/:id`
- `PATCH /api/workout-sessions/:id`
- `POST /api/workout-sessions/:id/logs`

Trainer-user chat:

- `GET /api/chat/unread`
- `GET /api/chat/:connectionId/messages`
- `POST /api/chat/:connectionId/messages`
- `PATCH /api/chat/:connectionId/read`

Socket events:

- `notification:new`, `notification:count`
- `chat:join`, `chat:send`, `chat:receive`, `chat:typing`, `chat:read`

All existing API response formats remain unchanged.

## Docker

~~~powershell
docker compose up --build
~~~

This starts Flyway, Redis, the API and Vite. The API waits for Flyway to finish successfully.
To run only migrations, use docker compose up flyway. Flyway uses the schema configured in
server/flyway/flyway.conf; the default public target is the same schema used by the API.

Build the production API image independently with:

```powershell
docker build -t fifb-api .\server
docker run --env-file .\server\.env -p 4000:4000 fifb-api
```

## Quality Checks

```powershell
cd server
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
npm.cmd run format:check

cd ..\client
npm.cmd run lint
npm.cmd run build
npm.cmd run format:check
```

For production, run `npm run build` then `npm start` in `server/`. `npm run dev` runs TypeScript
with automatic restarts. Docker builds the compiled backend; rebuild with `docker compose up --build`
after source changes. Existing database/import scripts continue to run directly with Node.

GitHub Actions runs server lint/build/tests, client lint/build, and the same Flyway container against an isolated PostgreSQL service to check V1 and repeated migrations. The Render Blueprint deploys the
`main` branch automatically after those checks pass. Telegram notifications optionally use
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

Backend unit/HTTP tests override service settings before loading `.env`, so they do not connect
to developer Redis, PostgreSQL or SendGrid. Formatting accepts native Windows and Unix line endings.
CI also checks formatting and TypeScript types, verifies V1/V2 in an isolated schema, and runs
the integration suite against an empty public schema with PostgreSQL and Redis.

To run integration tests locally, provision disposable PostgreSQL and Redis services and migrate
the **local database named `fifb_integration`** with Flyway first. Use separate Flyway credentials;
do not reuse the production migration settings. Then:

```powershell
cd server
$env:FIFB_INTEGRATION_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/fifb_integration'
$env:FIFB_INTEGRATION_REDIS_URL = 'redis://127.0.0.1:6379/15'
npm.cmd run test:integration
```

The suite refuses remote services and other database names, creates its own uniquely identified
fixtures, and deletes only those fixtures. It verifies migration versions, nullable measurements,
constraints, rollback, Redis session expiry/revocation, and authenticated workout logging,
ownership and volume statistics. It runs separately from `npm test` and requires live services.
