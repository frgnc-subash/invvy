# invvy Frontend

The invvy frontend is a React + Vite application for managing inventories, categories, items, notifications, and authentication.

## Features

- Login and registration screens
- Protected inventory workspace
- Dashboard with summary cards and notifications
- Inventory, category, and item management flows
- Responsive sidebar with collapsed and expanded states
- Dark and light theme support

## Setup

```bash
cd client
npm install
```

Create a local env file:

```bash
printf 'VITE_API_URL=http://localhost:8000/api\n' > .env
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Environment

- `VITE_API_URL` - backend API base URL

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - type-check and build for production
- `npm run lint` - run ESLint
- `npm run preview` - preview the production build locally

## Notes

- The app stores the auth token in `localStorage` under `inventrack_token`.
- If `VITE_API_URL` is not set, the frontend talks to `http://localhost:8000/api`.
- The client is configured for SPA deployment, so rewrites should route all paths to `index.html`.

## Vercel Deployment

If you deploy this app to Vercel, use these settings:

- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_URL=https://invvy.onrender.com/api`

After the Vercel deployment is live, add `https://invvyy.vercel.app` to the backend `CORS_ORIGINS` env var on Render.
