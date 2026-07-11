# FiFB Frontend

React + Vite frontend for FiFB / GR. This client calls the existing Express backend API only.

## Setup

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Vite runs on `http://localhost:5173` by default.

If a Docker Compose frontend service is used in your local setup, expose it at `http://localhost:3000`.

## API Configuration

Default `.env.example`:

```env
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:4000
```

During development, Vite proxies `/api` to `http://localhost:4000`, matching the backend README health check at `GET http://localhost:4000/api/health`.
The backend API port follows `server/.env` `PORT`; the default is `4000`.

If you do not want to use the Vite proxy, set:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

and make sure backend CORS allows the Vite origin.

For cookie-based refresh auth, backend CORS must allow credentials and include the frontend origin in `CORS_ORIGIN`.

## Main Routes

- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- Public: `/exercises`, `/exercises/:id`, `/trainers`, `/trainers/:id`
- User/Trainer: `/profile`, `/favorites`, `/workout-plans`, `/connections`, `/notifications`
- Trainer: `/trainer`, `/trainer/profile`, `/trainer/requests`, `/trainer/certificates`, `/trainer/exercises`, `/trainer/reviews`
- Admin: `/admin`, `/admin/users`, `/admin/exercises`, `/admin/certificates`, `/admin/audit-logs`, `/admin/email-deliveries`

## Demo Accounts

No demo credentials are included in the repository. Use accounts created through the backend registration flow or seed your own database records.
