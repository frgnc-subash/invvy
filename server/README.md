# invvy API

FastAPI backend for invvy. It provides authentication, dashboard stats, notifications, inventories, categories, and items.

## Features

- Email/password authentication with JWT access tokens
- Inventory, category, and item CRUD
- Dashboard statistics
- Notification read and archive actions
- PostgreSQL support with automatic SQLite fallback for local development

## Local Setup

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

If you prefer `uv`, you can install dependencies with:

```bash
uv sync
```

Then run:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

Copy `.env.example` and configure the values you need.

- `DATABASE_URL` - optional Postgres connection string
- `DATABASE_CONNECT_TIMEOUT` - Postgres connection timeout in seconds
- `USE_LOCAL_SQLITE` - force local SQLite when set to `true`
- `JWT_SECRET` - secret used to sign JWT tokens
- `PORT` - deployment port used by hosting platforms
- `CORS_ORIGINS` - comma-separated list of allowed frontend origins
- `DEMO_USER_ENABLED` - creates/updates the demo login on startup when `true`
- `DEMO_EMAIL` - demo login email, defaults to `demo@invvy.app`
- `DEMO_PASSWORD` - demo login password, defaults to `password`
- `DEMO_NAME` - display name for the demo user

## Database Behavior

- If `DATABASE_URL` is unset, the app uses local SQLite at `server/sql_app.db`.
- If `USE_LOCAL_SQLITE=true`, SQLite is used even when a database URL is provided.
- If a Postgres schema is incompatible, the app falls back to SQLite so local development can continue.

## API Overview

- `GET /` - health check
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/stats`
- `GET /api/notifications`
- `PATCH /api/notifications/{id}/read`
- `PATCH /api/notifications/{id}/archive`
- `GET /api/inventories`
- `POST /api/inventories`
- `GET /api/inventories/{inv_id}`
- `PUT /api/inventories/{inv_id}`
- `DELETE /api/inventories/{inv_id}`
- `GET /api/inventories/{inv_id}/categories`
- `POST /api/inventories/{inv_id}/categories`
- `PUT /api/inventories/{inv_id}/categories/{cid}`
- `DELETE /api/inventories/{inv_id}/categories/{cid}`
- `GET /api/items`
- `POST /api/items`
- `PUT /api/items/{item_id}`
- `DELETE /api/items/{item_id}`

## Tests

```bash
pytest
```

## Docker

Build and run from the `server/` directory:

```bash
docker build -t invvy-backend .
docker run -p 8000:8000 --env-file .env invvy-backend
```

## Notes

- CORS is configured from `CORS_ORIGINS`, with `*` as a fallback.
- For your deployed frontend, include `https://invvyy.vercel.app` in `CORS_ORIGINS`.
- The default demo account is `demo@invvy.app` / `password` unless overridden by environment variables.
- The backend entry point is `app.main:app`.
