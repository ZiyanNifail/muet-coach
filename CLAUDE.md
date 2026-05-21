# Presentation Coach FYP

AI-powered MUET speaking practice tool. Students record/upload presentations and get automated multimodal coaching (band score, gaze, posture, CEFR feedback). Educators manage courses, assignments, and review submissions.

## Rules

- Functional components only — no class components
- No comments unless logic is genuinely non-obvious
- Don't refactor working code unless it's blocking the task
- Before saying something works, run it and verify yourself
- Responses: terse for simple tasks, explanatory for architecture/design decisions

## Tech Stack

**Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion, Supabase Auth, SWR, Recharts

**Backend:** FastAPI + Uvicorn (Python async), Supabase PostgreSQL + RLS, Groq API, MediaPipe 0.10.x (Tasks API), librosa, OpenCV, APScheduler

**AI Pipeline:**
- Groq `whisper-large-v3-turbo` — speech-to-text
- Groq `llama-3.3-70b-versatile` — coaching feedback, writing evaluation
- MediaPipe Face Mesh + Pose — eye contact %, posture score
- VADER — sentiment analysis
- librosa — voice dynamics (pitch, energy, clarity)

## Dev Commands

```bash
# Backend
cd backend
venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm run dev    # localhost:3000
```

## Project Structure

```
presentation-coach-fyp/
├── frontend/
│   ├── app/
│   │   ├── (auth)/             login, register
│   │   ├── (student)/          dashboard, practice, results/[id], progress, history,
│   │   │                       courses, pronunciation, listening, writing, exam,
│   │   │                       filler-drill, upload
│   │   ├── (educator)/         dashboard, courses/[id], assignments/new,
│   │   │                       submissions/[sid], students, analytics
│   │   └── admin/              admin panel
│   ├── components/             RecordingInterface, Sidebar, TopicWheel, BrainstormPanel,
│   │                           LearningPathPanel, ConsentModal, RubricPanel
│   └── lib/                    api.ts, supabase.ts, auth.ts,
│                               listeningQuestions.ts, writingPrompts.ts
├── backend/
│   ├── main.py                 FastAPI app + APScheduler (weekly retention cleanup)
│   ├── routers/                auth, presentations, reports, courses, submissions,
│   │                           admin, gaze, pronunciation, drills, listening, writing
│   └── services/               pipeline, groq_service, whisper_service,
│                               mediapipe_service, nlp_service, cefr_evaluator,
│                               sentiment_service, voice_dynamics_service,
│                               audio_service, video_service, storage_service,
│                               writing_service, drills_service, supabase_client
└── supabase_setup.sql          Full DB schema (source of truth)
```

## AI Pipeline Flow

`POST /api/presentations/upload` → background task:

1. Audio extraction (WAV) → chunked for Whisper
2. Whisper STT → transcript + word-level clarity
3. MediaPipe → eye contact %, posture score (parallelised with audio)
4. NLP → filler count, WPM, lexical diversity, discourse markers, sentence stats
5. CEFR evaluator → rule-based band score (1.0–6.0)
6. Voice dynamics → pitch mean/std, energy, stress index
7. VADER sentiment → sentiment score
8. Groq Llama 3.3 70B → rubric feedback + per-criterion bands (anchored to rule-based score ±0.5)
9. Confidence score composite → stored in DB
10. Video compressed (480p H.264) → Supabase Storage

**Confidence score weights:** band 30% · eye contact 20% · posture 15% · voice clarity 15% · WPM 10% · sentiment 10% · filler penalty up to −15

## Database Tables

| Table | Purpose |
|---|---|
| `users` | Extends auth.users |
| `consent_log` | PDPA consent tracking |
| `muet_topics` | Speaking topic bank |
| `educator_approvals` | Educator role gating |
| `presentations` | Recording sessions + status |
| `feedback_reports` | AI coaching results |
| `session_history` | Per-session timeline |
| `courses` | Educator-created courses |
| `course_members` | Student enrolment |
| `assignments` | Course assignments |
| `educator_overrides` | HITL band corrections |
| `listening_sessions` | MUET listening practice results |
| `writing_sessions` | MUET writing practice results |

## API Endpoints

| Prefix | Router | Key endpoints |
|---|---|---|
| `/api/auth` | auth | login, register, profile |
| `/api/presentations` | presentations | `POST /upload`, `GET /{id}` |
| `/api/reports` | reports | `GET /{presentation_id}` |
| `/api/courses` | courses | CRUD for courses, members, assignments |
| `/api/submissions` | submissions | assignment submission management |
| `/api/admin` | admin | user/approval management |
| `/api/gaze` | gaze | standalone gaze analysis |
| `/api/pronunciation` | pronunciation | syllable-level pronunciation scoring |
| `/api/drills` | drills | weakness-targeted drill recommendations |
| `/api/listening` | listening | `POST /submit`, `GET /sessions/{id}` |
| `/api/writing` | writing | `POST /submit`, `GET /sessions/{id}` |

## MUET Features

- **Speaking practice** — live recording or file upload → full AI pipeline → band score 1–6
- **Pronunciation** — syllable-level scoring with tips
- **Filler drill** — 60-second real-time filler detection challenge
- **Listening** — section-based MCQ with band grading
- **Writing** — Task 1 (graph/table) + Task 2 (essay), Groq-graded, overall = (T1 + T2×2) / 3
- **Exam mode** — full MUET simulation (listening → writing → speaking)
- **Drills** — per-criterion targeted exercises based on lowest rubric sub-band

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
```
