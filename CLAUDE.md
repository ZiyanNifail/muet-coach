# Presentation Coach FYP

AI-powered MUET speaking practice tool. Students record presentations, get automated coaching (band score, gaze, posture, CEFR feedback). Educators manage courses and review submissions.

## Rules

- Functional components only — no class components
- No comments unless logic is genuinely non-obvious
- Don't refactor working code unless it's blocking the task
- Before saying something works, run it and verify yourself
- Responses: terse for simple tasks, explanatory for architecture/design decisions

## Tech Stack

**Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion, Supabase Auth, SWR, Recharts

**Backend:** FastAPI + Uvicorn (Python async), Supabase PostgreSQL + RLS, Groq API, MediaPipe, librosa, OpenCV, APScheduler

**AI:** Groq Whisper (whisper-large-v3-turbo) for STT, Groq Llama 3.3 70B for coaching, VADER sentiment, MediaPipe Face Mesh + Pose

## Dev Commands

```bash
# Backend
cd backend
source venv/Scripts/activate        # Windows: venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm run dev                          # localhost:3000

# Verify backend
curl http://localhost:8000/health
```

## Project Structure

```
presentation-coach-fyp/
├── frontend/
│   ├── app/
│   │   ├── (auth)/          login, register
│   │   ├── (student)/       dashboard, practice, results, progress, history, courses
│   │   ├── (educator)/      dashboard, courses, assignments, submissions, analytics
│   │   └── admin/
│   ├── components/          RecordingInterface, TranscriptViewer, TopicWheel, etc.
│   ├── lib/
│   │   ├── api.ts           apiFetch() wrapper + swrFetcher()
│   │   ├── supabase.ts      Supabase client
│   │   └── auth.ts          Auth helpers
│   └── types/
├── backend/
│   ├── main.py              FastAPI app + lifespan (APScheduler)
│   ├── routers/             auth, presentations, reports, courses, submissions, admin, gaze, pronunciation
│   ├── services/            pipeline, groq_service, whisper_service, mediapipe_service,
│   │                        audio_service, video_service, sentiment, nlp, cefr, storage
│   └── requirements.txt
└── supabase_setup.sql       Full DB schema (source of truth, no migrations)
```

## Backend API Routes

All routes prefixed `/api`:

| Router | Key Endpoints |
|---|---|
| auth | POST /auth/login, /auth/register — GET /auth/me |
| presentations | POST /presentations/upload — GET /presentations/{id}, /presentations/list |
| reports | GET /reports/{id} — band score + advice cards |
| courses | GET/POST /courses — GET /courses/{id} |
| submissions | GET /submissions, /submissions/{id} |
| admin | GET /admin/users — POST /admin/approve-educator |
| gaze | POST /gaze/analyze |
| pronunciation | POST /pronunciation/analyze |
| health | GET /health, /health/db |

Protected routes require: `Authorization: Bearer <JWT>`
File uploads use: `Content-Type: multipart/form-data`

## Frontend Routes

| Role | Routes |
|---|---|
| Public | `/login`, `/register`, `/` |
| Student | `/dashboard`, `/practice`, `/results/[id]`, `/progress`, `/history`, `/courses` |
| Educator | `/educator/dashboard`, `/educator/courses`, `/educator/courses/[id]`, `/educator/students`, `/educator/submissions`, `/educator/analytics` |
| Admin | `/admin` |

## Environment Variables

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://avzmgctjongzcqtpvyhk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ADMIN_ACCESS_KEY=fyp-admin-ziyan-2024
```

**Backend** (`backend/.env`):
```
SUPABASE_URL=https://avzmgctjongzcqtpvyhk.supabase.co
SUPABASE_SERVICE_KEY=...
GROQ_API_KEY=gsk_...
WHISPER_MODEL=tiny
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
ADMIN_ACCESS_KEY=fyp-admin-ziyan-2024
DEBUG=true
```

## Database Schema

| Table | Purpose |
|---|---|
| users | Extends auth.users — role, consent flag |
| consent_log | GDPR opt-in audit trail |
| muet_topics | 30 MUET exam topics (seeded) |
| educator_approvals | Educator verification queue |
| courses | Educator-created courses |
| assignments | Course assignments |
| presentations | Student video submissions + status |
| analysis_results | Gaze, posture, fluency metrics |
| advice_cards | Groq-generated coaching feedback |

RLS: students see own data only; educators see their students' submissions; admins can manage users and approvals.

## Key Patterns

**Auth flow:**
1. Supabase Auth (email/password) → JWT + refresh token
2. Stored in HttpOnly cookie via auth-helpers-nextjs
3. Backend validates JWT in `auth_deps.py`
4. RLS enforces role-based access at DB level

**API calls (frontend):**
- `apiFetch(path, options)` — generic fetch wrapper, throws on 4xx/5xx
- `swrFetcher([path, token])` — SWR-compatible with JWT auth
- All calls target `NEXT_PUBLIC_API_URL`

**Analysis pipeline (`services/pipeline.py`):**
Video upload → extract audio (librosa) → Groq Whisper STT (25s chunks, parallel) → MediaPipe gaze/posture (5 FPS) → Groq Llama coaching → store results

**Groq rate limiting:** Token-bucket at 25 req/min (safe under free tier 30/min). Local Whisper (tiny, CPU) as fallback.

**Data retention:** APScheduler weekly job deletes video/audio files older than 90 days. DB records kept indefinitely.

## Common Debug Points

| Symptom | Check |
|---|---|
| API 500s | Backend logs + `GROQ_API_KEY` in `.env` |
| Slow transcription | Groq key valid? Fallback = local CPU whisper |
| MediaPipe crash | `opencv-python` installed (not headless variant) |
| JWT auth fails | Supabase keys match in both `.env` files |
| CORS errors | `FRONTEND_URL` set in backend `.env` |
| Upload fails | `/backend/uploads/` directory exists and is writable |
