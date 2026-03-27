# PresentAI — AI-Driven Multimodal Presentation Coach

> Final Year Project (FYP) — Bachelor in Computer Science (Honours), Management and Science University (MSU)

PresentAI is a web-based application that uses artificial intelligence to help students improve their presentation skills. Users record themselves presenting, and the system analyzes their speech, language, and body language to generate personalized, actionable feedback.

---

## Features

- **Speech Analysis** — Transcribes audio using Whisper and evaluates clarity, pace, and filler word usage
- **Language Proficiency** — Assesses vocabulary and structure against CEFR levels using spaCy and NLP
- **Body Language Detection** — Tracks posture, eye contact, and gestures via MediaPipe
- **AI Feedback** — Generates detailed coaching reports using Llama 3.3 70B via Groq
- **Practice Modes** — Guided and free practice flows with topic suggestions
- **Role-Based Access** — Separate dashboards for students and educators
- **Session History** — Track progress and review past sessions over time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, Tailwind CSS v4, TypeScript |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL + Storage) |
| AI / ML | Groq (Llama 3.3 70B), OpenAI Whisper, MediaPipe, spaCy |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Project Structure

```
presentation-coach-fyp/
├── frontend/               # Next.js application
│   ├── app/
│   │   ├── (auth)/         # Login & registration pages
│   │   ├── (student)/      # Student dashboard, practice, results, history
│   │   └── (educator)/     # Educator dashboard and course management
│   └── ...
├── backend/                # FastAPI application
│   ├── routers/            # API route handlers
│   │   ├── auth.py
│   │   ├── presentations.py
│   │   ├── submissions.py
│   │   ├── courses.py
│   │   └── reports.py
│   ├── services/           # Business logic and AI integrations
│   │   ├── pipeline.py
│   │   ├── whisper_service.py
│   │   ├── groq_service.py
│   │   ├── mediapipe_service.py
│   │   ├── nlp_service.py
│   │   └── cefr_evaluator.py
│   └── main.py
├── supabase_setup.sql      # Database schema
└── TASKLIST.md             # Development task tracking
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key

### 1. Clone the repository

```bash
git clone https://github.com/your-username/presentation-coach-fyp.git
cd presentation-coach-fyp
```

### 2. Set up the database

Run the SQL schema in your Supabase project's SQL Editor:

```
supabase_setup.sql
```

Also disable email confirmation in your Supabase Auth settings for local development.

### 3. Configure environment variables

**Backend** — create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
GROQ_API_KEY=your_groq_api_key
WHISPER_MODEL=tiny
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
```

**Frontend** — create `frontend/.env.local` from the example:

```bash
cp frontend/.env.example frontend/.env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Run the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## Author

**Ziyan Nifail**
Bachelor in Computer Science (Honours)
Management and Science University (MSU)
