# Setup & Development Guide
## AI Presentation Coaching Tool

> **Author:** Ziyan Nifail
> **For:** Complete beginners — every step is explained from scratch

---

## Part 1 — Setting Up VS Code

### Step 1: Install VS Code
1. Go to https://code.visualstudio.com
2. Click **Download for Windows** (or Mac/Linux)
3. Run the installer — accept all defaults
4. Open VS Code

### Step 2: Install Required Extensions
Open VS Code. Press `Ctrl+Shift+X` (Windows) or `Cmd+Shift+X` (Mac) to open Extensions. Search and install each one:

| Extension | Why You Need It |
|---|---|
| **Python** (by Microsoft) | Python language support, syntax highlighting |
| **Pylance** (by Microsoft) | Python autocomplete and error detection |
| **ESLint** | JavaScript/TypeScript error checking |
| **Prettier** | Auto-formats your code on save |
| **Tailwind CSS IntelliSense** | Autocompletes Tailwind class names |
| **GitLens** | Shows git history inline in code |
| **Thunder Client** | Test your FastAPI endpoints directly in VS Code |

### Step 3: Configure Auto-Format on Save
1. Press `Ctrl+Shift+P` → type `Open User Settings (JSON)`
2. Add these lines inside the `{}`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "ms-python.python"
  },
  "editor.tabSize": 2,
  "editor.insertSpaces": true
}
```

### Step 4: Install Required Software

**Node.js 20** (for Next.js):
- Go to https://nodejs.org → download **LTS** version
- Run installer, accept defaults
- Verify: open a terminal in VS Code (`Ctrl+`` `) and type `node --version` — should show `v20.x.x`

**Python 3.11** (for FastAPI):
- Go to https://python.org/downloads
- Download Python 3.11.x
- **Important:** tick "Add Python to PATH" during install
- Verify: `python --version` in terminal — should show `3.11.x`

**Git**:
- Go to https://git-scm.com → download for your OS
- Run installer, accept all defaults
- Verify: `git --version` in terminal

---

## Part 2 — Setting Up Claude Code

Claude Code is a command-line tool that lets Claude write, edit, and run code directly in your project. It works alongside VS Code.

### Step 1: Install Claude Code
Open a terminal (in VS Code or standalone) and run:
```bash
npm install -g @anthropic-ai/claude-code
```

Verify:
```bash
claude --version
```

### Step 2: Authenticate Claude Code
```bash
claude login
```
This opens your browser. Log in with your Anthropic/Claude account.

### Step 3: How to Use Claude Code

Navigate into your project folder first:
```bash
cd your-project-folder
claude
```

This opens an interactive session. You can type instructions like:
- `"Build the registration page with role selection"`
- `"Add the topic scroll wheel component"`
- `"Fix the error in app/practice/page.tsx"`

### Step 4: Give Claude Code the Context Files

**This is the most important step.** Before starting any development task, tell Claude Code to read your project documents:

```
Read PRD.md, TASKLIST.md, and DESIGN.md in this project. 
These define the full requirements, tech stack, database schema, 
and UI design for this project. We are starting at task T1.12.
```

From then on, Claude Code has full context and will write code that matches your PRD, design, and schema without you needing to re-explain everything.

### Step 5: Good Prompting Patterns for Beginners

**Starting a new task:**
```
We are working on task T2.05B from TASKLIST.md — the topic scroll wheel modal.
Refer to DESIGN.md Section 6.4 for the exact UI specification.
Build this as a Next.js component at components/TopicWheel.tsx
```

**When you get an error:**
```
I got this error: [paste error here]
The error is in [file name]. Fix it.
```

**When you want to check what was built:**
```
Summarise what has been built so far and which TASKLIST tasks are complete.
```

**When starting a new session:**
```
Re-read PRD.md and TASKLIST.md. The last task we completed was T2.01C.
Continue with T2.02.
```

---

## Part 3 — GitHub Setup

### Step 1: Create a GitHub Account
Go to https://github.com and create a free account if you don't have one.

### Step 2: Create the Repository
1. On GitHub, click **New repository**
2. Name it: `presentation-coach-fyp`
3. Set to **Private** (recommended — your FYP is sensitive work)
4. **Do not** tick "Add README" (we'll push our own files)
5. Click **Create repository**

### Step 3: Set Up Git in Your Project

Open VS Code terminal in your project folder:

```bash
git init
git branch -M main
```

Create a `.gitignore` file to exclude sensitive and large files:

```bash
# .gitignore
.env
.env.local
.env.production
__pycache__/
*.pyc
.venv/
venv/
node_modules/
.next/
*.wav
*.webm
*.mp4
uploads/
.DS_Store
```

### Step 4: Connect to GitHub

```bash
git remote add origin https://github.com/YOUR-USERNAME/presentation-coach-fyp.git
```

### Step 5: First Commit (push your documents)

```bash
git add PRD.md TASKLIST.md DESIGN.md SETUP.md .gitignore
git commit -m "docs: add PRD, tasklist, design system, and setup guide"
git push -u origin main
```

### Step 6: Branching Strategy (beginner-friendly)

Work on features in separate branches so `main` is always stable:

```bash
# Start a new feature
git checkout -b feature/role-selection-auth

# After Claude Code builds it and it works:
git add .
git commit -m "feat: add role selection on registration and admin approval flow"
git checkout main
git merge feature/role-selection-auth
git push origin main
```

**Commit message convention:**
| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | UI/CSS only changes |
| `refactor:` | Code restructure (no new feature) |
| `test:` | Adding tests |
| `chore:` | Config, dependencies |

---

## Part 4 — Project Structure

After running the setup commands below, your project will look like this:

```
presentation-coach-fyp/
│
├── frontend/                    ← Next.js app (deployed on Vercel)
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── practice/page.tsx
│   │   ├── results/[id]/page.tsx
│   │   ├── progress/page.tsx
│   │   ├── history/page.tsx
│   │   ├── courses/page.tsx
│   │   ├── educator/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── courses/[id]/page.tsx
│   │   │   └── review/[id]/page.tsx
│   │   └── admin/page.tsx
│   ├── components/
│   │   ├── ui/                  ← Reusable: Button, Card, Badge, Input
│   │   ├── TopicWheel.tsx       ← Scroll wheel modal
│   │   ├── BrainstormPanel.tsx  ← 1-min timer + notes
│   │   ├── RecordingInterface.tsx
│   │   ├── WarningOverlay.tsx   ← Guided mode popups
│   │   ├── FeedbackReport.tsx
│   │   └── ProgressCharts.tsx
│   ├── lib/
│   │   ├── supabase.ts          ← Supabase client
│   │   └── api.ts               ← FastAPI calls
│   ├── .env.local               ← NOT committed to GitHub
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                     ← FastAPI app (deployed on Railway)
│   ├── main.py                  ← FastAPI app entry point
│   ├── routers/
│   │   ├── auth.py
│   │   ├── presentations.py
│   │   ├── reports.py
│   │   ├── courses.py
│   │   ├── analytics.py
│   │   └── admin.py
│   ├── services/
│   │   ├── whisper_service.py
│   │   ├── mediapipe_service.py
│   │   ├── groq_service.py
│   │   └── cefr_evaluator.py
│   ├── models/                  ← Pydantic schemas
│   ├── .env                     ← NOT committed to GitHub
│   └── requirements.txt
│
├── PRD.md
├── TASKLIST.md
├── DESIGN.md
├── SETUP.md                     ← This file
└── .gitignore
```

---

## Part 5 — Initial Project Scaffolding Commands

Run these once to create the project structure. After this, Claude Code takes over.

### Frontend (Next.js)
```bash
# From project root
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir
cd frontend
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install recharts lucide-react clsx
npm install -D @types/node
```

### Backend (FastAPI)
```bash
# From project root
mkdir backend && cd backend
python -m venv venv

# Activate virtual environment:
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install fastapi uvicorn python-multipart supabase
pip install openai-whisper torch --extra-index-url https://download.pytorch.org/whl/cpu
pip install mediapipe opencv-python-headless librosa spacy groq
pip install apscheduler jiwer python-dotenv
python -m spacy download en_core_web_sm

# Save dependencies:
pip freeze > requirements.txt
```

### Tailwind Configuration
Replace `frontend/tailwind.config.js` with the configuration from `DESIGN.md` Section 9.

---

## Part 6 — Connecting Services

### Supabase
1. Go to https://supabase.com → New Project
2. Note your **Project URL** and **anon public key** (Settings → API)
3. Note your **service role key** (for backend — keep this secret)
4. In `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```
5. In `backend/.env`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-api-key
WHISPER_MODEL=tiny
```

### Groq API Key
1. Go to https://console.groq.com → sign up free
2. Create an API key
3. Add to `backend/.env` as `GROQ_API_KEY`

---

## Part 7 — Development Workflow (Day-to-Day)

### Starting a work session
```bash
# 1. Pull latest changes
git pull origin main

# 2. Create a branch for today's task
git checkout -b feature/task-name

# 3. Start backend
cd backend
source venv/bin/activate   # or venv\Scripts\activate on Windows
uvicorn main:app --reload

# 4. Start frontend (new terminal tab)
cd frontend
npm run dev

# 5. Open Claude Code (new terminal tab)
cd ..   # back to project root
claude
```

Then tell Claude Code what task you're working on.

### Ending a work session
```bash
git add .
git commit -m "feat: describe what was built"
git push origin feature/task-name
```

Then on GitHub, open a Pull Request from your feature branch into `main`.

### Recommended task order for development
Follow the TASKLIST.md phases in order. Do not skip phases — each phase depends on the previous. Within a phase, do High priority tasks before Medium.

Start here when you open Claude Code for the first time:
```
T1.11 → T1.12 → T1.13 → T1.14 → T1.15
```
Then:
```
T2.01 → T2.01A → T2.01B → T2.01C → T2.02 → T2.03
```
Then the practice session flow:
```
T2.05A → T2.05B → T2.05C → T2.05D → T2.05E
```

---

## Quick Reference

| Action | Command |
|---|---|
| Start backend | `cd backend && uvicorn main:app --reload` |
| Start frontend | `cd frontend && npm run dev` |
| Open Claude Code | `claude` (from project root) |
| Save work to GitHub | `git add . && git commit -m "message" && git push` |
| Install new Python package | `pip install package-name && pip freeze > requirements.txt` |
| Install new JS package | `cd frontend && npm install package-name` |
| View Supabase tables | https://supabase.com → your project → Table Editor |
| View FastAPI docs | http://localhost:8000/docs (when backend is running) |
| View app | http://localhost:3000 (when frontend is running) |
