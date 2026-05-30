# invvy

invvy is a full-stack inventory workspace for managing inventories, categories, items, notifications, and authentication in one place.

## What's in this repo

- `client/` - React + Vite frontend
- `server/` - FastAPI backend
- `tests/` - backend integration tests

## Features

- Authentication with login and registration
- Inventory, category, and item management
- Dashboard stats and notification actions
- Responsive sidebar layout with dark and light themes
- Edit/create modals for inventory data

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn-style components
- Backend: FastAPI, SQLAlchemy, Pydantic, SQLite or Postgres

## Local Development

Run the backend and frontend in separate terminals.

### 1. Backend

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

If you prefer `uv`, you can also install dependencies with `uv sync`.

### 2. Frontend

```bash
cd client
npm install
printf 'VITE_API_URL=http://localhost:8000/api\n' > .env
npm run dev
```

Open `http://localhost:5173`.

## Environment Variables

Backend:

- `DATABASE_URL` - optional Postgres connection string
- `DATABASE_CONNECT_TIMEOUT` - Postgres connection timeout in seconds
- `USE_LOCAL_SQLITE` - force local SQLite when set to `true`
- `JWT_SECRET` - signing key for access tokens
- `CORS_ORIGINS` - comma-separated allowed origins
- `PORT` - deployment port used by hosting platforms

Frontend:

- `VITE_API_URL` - API base URL, defaults to `http://localhost:8000/api`

## Data Storage

- If `DATABASE_URL` is missing, the backend falls back to local SQLite at `server/sql_app.db`.
- If `USE_LOCAL_SQLITE=true`, SQLite is used even when `DATABASE_URL` is present.

## Common Commands

Frontend:

```bash
npm run dev
npm run build
npm run lint
```

Backend:

```bash
pytest
uvicorn app.main:app --reload
```

## Deployment

- Frontend can be deployed on Vercel using the `client/` app.
- Backend can be deployed on Render using `render.yaml` and the Dockerfile in `server/`.

### Vercel Frontend

Use the `client/` directory as the Vercel project root.

- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_URL=https://invvy.onrender.com/api`

After deployment, copy the Vercel domain and add it to the backend `CORS_ORIGINS` env var on Render.

### Render Backend

- `DATABASE_URL` for Postgres if you want persistent storage
- `JWT_SECRET` must be set in production
- `CORS_ORIGINS` should include your Vercel frontend URL, for example `https://your-app.vercel.app`
