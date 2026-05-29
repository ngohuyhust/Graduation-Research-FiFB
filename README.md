# Graduation-Research-FitCom

FiFB / GR backend workspace.

## Current Scope
- Backend only.
- No frontend implementation in this pass.
- No Next.js.
- No AI service.
- Runtime: Node.js + Express + plain JavaScript.

The backend code lives in:

```text
server/
```

## Database
The database already exists in Supabase and was created from:

```text
Document/DatabaseSQL.txt
```

That SQL file is the runtime database contract. Do not rename tables, columns, enum/status values, or views from the backend.

If your Supabase database was already created with Supabase SQL Editor, skip migration.

## Backend Setup
```powershell
cd server
npm.cmd install
Copy-Item .env.example .env
```

Edit `server/.env`:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- SendGrid values if using email verification/password reset
- Redis values if `REDIS_DISABLED=false`

PowerShell blocks `npm.ps1` on this machine, so use `npm.cmd`.

## Migration
Migration is optional and only for a fresh local database.

Default behavior:

```powershell
cd server
npm.cmd run migrate
```

This skips without touching the database.

Fresh local database only:

```powershell
cd server
$env:ALLOW_OPTIONAL_MIGRATION="true"
npm.cmd run migrate
```

## Run Backend
```powershell
cd server
npm.cmd run dev
```

Health check:

```text
GET http://localhost:4000/api/health
```

## Quality Checks
```powershell
cd server
npm.cmd run lint
npm.cmd test
```

## API Documentation
Full API docs:

```text
server/docs/API.md
```

Root pointer:

```text
docs/API.md
```
