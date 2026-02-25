# Deployment Guide

This app has two deploy targets:

- Frontend (React static build) -> GitHub Pages
- Backend (Node + PostgreSQL) -> Render (or Railway)

## 1) Frontend on GitHub Pages

Repo-side setup is already added:

- `.github/workflows/deploy-pages.yml`
- `frontend/vite.config.js` uses `VITE_BASE_PATH`
- Router uses hash routing for Pages-safe refresh behavior

What you need to do in GitHub:

1. Push changes to `main`.
2. Go to `Settings -> Pages`.
3. Set source to `GitHub Actions`.
4. Go to `Settings -> Secrets and variables -> Actions -> Variables`.
5. Add repository variable:
   - `VITE_API_URL=https://<your-backend-domain>/api/v1`
6. Push to `main` again (or run workflow manually via Actions tab).
7. Open:
   - `https://<your-github-username>.github.io/<repo-name>/`

## 2) Backend + Database on Render

### A) Create PostgreSQL

1. In Render dashboard, create a new PostgreSQL database.
2. Copy its external connection string.

### B) Create backend web service

1. Create a new Web Service from your GitHub repo.
2. Use these commands:
   - Build command: `npm ci`
   - Start command: `npm run start --workspace backend`
3. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=4000`
   - `DATABASE_URL=<render-postgres-external-url>`
   - `DB_SSL=true`
   - `DB_SSL_REJECT_UNAUTHORIZED=false`
   - `AUTH_SECRET=<long-random-secret>`
   - `APP_ADMIN_USERNAME=<your-admin-user>`
   - `APP_ADMIN_PASSWORD=<your-strong-password>`
   - `APP_ADMIN_DISPLAY_NAME=Administrator`

### C) Run database schema and seed

After backend service is connected:

1. Open Render Shell for the web service.
2. Run:
   - `npm run db:schema --workspace backend`
   - `npm run db:seed:demo --workspace backend`

These create/upgrade schema and seed master/demo data.

### D) Verify backend

Open:

- `https://<your-backend-domain>/api/v1/health`

Then update GitHub variable `VITE_API_URL` to this backend URL + `/api/v1`.

## 3) Release checklist

1. Confirm frontend can login from Pages URL.
2. Confirm voucher create/post works.
3. Confirm dashboard, daybook, trial balance load.
4. Change default admin password in Render env.
5. Regenerate `AUTH_SECRET` for production.

## 4) Optional: Railway instead of Render

Use the same env variables and commands:

- Build: `npm ci`
- Start: `npm run start --workspace backend`
- Migrations:
  - `npm run db:schema --workspace backend`
  - `npm run db:seed:demo --workspace backend`
