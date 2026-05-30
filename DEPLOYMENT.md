# Deployment Guide

Two services to deploy: the **Next.js frontend** and the **FastAPI backend**. Supabase (DB + auth) is already hosted.

## 1. Backend (FastAPI)

**Env vars** — see [`backend/.env.example`](backend/.env.example). Required:

| Var | Notes |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service-role key (server-only secret) |
| `GROQ_API_KEY` | Groq API key |
| `WHISPER_MODEL` | e.g. `whisper-large-v3-turbo` |
| `ADMIN_ID` / `ADMIN_PASSWORD` | Admin login (verified server-side) |
| `ADMIN_ACCESS_KEY` | Long random string returned to the admin panel |
| `FRONTEND_URL` | **Must** match the deployed frontend origin or CORS will block requests |

**Run (production):**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
A `Dockerfile` and `render.yaml` are included for container/Render deploys.

**Health checks:**
- `GET /health` → `{"status":"healthy"}`
- `GET /api/health/db` → verifies Supabase connectivity

## 2. Frontend (Next.js)

**Env vars** — see [`frontend/.env.example`](frontend/.env.example). All are `NEXT_PUBLIC_*` (shipped to the browser — no secrets). Set `NEXT_PUBLIC_API_URL` to the deployed backend URL.

**Build & run:**
```bash
cd frontend
npm ci
npm run build
npm start
```

## 3. Pre-launch checklist

- [ ] Backend `FRONTEND_URL` set to the real frontend origin (CORS).
- [ ] Strong, unique `ADMIN_PASSWORD` (not a demo value).
- [ ] Real `.env` / `.env.local` filled from the `.env.example` files (never committed).
- [ ] Supabase RLS policies applied (`supabase_setup.sql`).
- [ ] Smoke test: sign in, run one speaking analysis, open the admin panel.

## Known follow-ups (not yet done)

Production hardening deferred from this pass: pipeline timeouts/concurrency limits, multi-worker server (gunicorn), build-time env validation, and CI. Address before high-volume use.
