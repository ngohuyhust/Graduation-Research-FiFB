# FiFB

FiFB is a fitness platform built with Express, PostgreSQL, Redis, Socket.IO, React, Vite, and Tailwind CSS.
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
  Client[React + Vite] -->|REST / JWT| API[Express API]
  Client <-->|Socket.IO| Socket[Realtime layer]
  API --> DB[(PostgreSQL)]
  API --> Redis[(Redis / Upstash)]
  Socket --> API
  API --> Email[SendGrid]
```

The backend keeps the existing module pattern:

```text
controller -> service -> repository -> PostgreSQL
                  |
                  +-> Redis / Socket.IO
```

## Local Setup

Requirements: Node.js 20+, PostgreSQL, and optionally Redis.

```powershell
cd server
npm.cmd install
Copy-Item .env.example .env

cd ..\client
npm.cmd install
Copy-Item .env.example .env
```

Configure `server/.env`, especially `DATABASE_URL`, JWT secrets, CORS, and Redis/Upstash values.
The existing base schema is documented in `Document/DatabaseSQL.txt`.

Apply the non-AI v2 additions:

```powershell
cd server
npm.cmd run migrate:v2 -- --dry-run
npm.cmd run migrate:v2
npm.cmd run migrate:indexes
```

Run both applications:

```powershell
# Terminal 1
cd server
npm.cmd run dev

# Terminal 2
cd client
npm.cmd run dev
```

- Client: `http://localhost:3000`
- API: `http://localhost:4000/api`
- Health: `http://localhost:4000/api/health`

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

```powershell
docker compose up --build
```

This starts the API, Vite client, and Redis. Build the production API image independently with:

```powershell
docker build -t fifb-api .\server
docker run --env-file .\server\.env -p 4000:4000 fifb-api
```

## Quality Checks

```powershell
cd server
npm.cmd run lint
npm.cmd test
npm.cmd run format:check

cd ..\client
npm.cmd run lint
npm.cmd run build
npm.cmd run format:check
```

GitHub Actions runs server lint/tests and client lint/build. The Render Blueprint deploys the
`main` branch automatically after those checks pass. Telegram notifications optionally use
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
