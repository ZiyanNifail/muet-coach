# System Readiness Checklist
## AI Presentation Coaching Tool

Work through each section top-to-bottom before running the app for the first time.
Tick each box as you go: change `[ ]` to `[x]`.

---

## 1. Prerequisites

### Software installed
- [ ] Node.js 20 LTS — verify: `node --version` → should show `v20.x.x`
- [ ] Python 3.11 — verify: `python --version` → should show `3.11.x`
- [ ] Git — verify: `git --version`

### VS Code extensions
- [ ] Python (Microsoft)
- [ ] Pylance (Microsoft)
- [ ] ESLint
- [ ] Prettier
- [ ] Tailwind CSS IntelliSense
- [ ] Thunder Client (for testing API endpoints)

---

## 2. Project Files

- [ ] `frontend/` folder exists with Next.js files
- [ ] `backend/` folder exists with `main.py`
- [ ] `supabase_setup.sql` exists at project root
- [ ] `PRD.md`, `TASKLIST.md`, `DESIGN.md`, `SETUP.md` all present

---

## 3. Environment Variables

### Frontend — `frontend/.env.local`
- [ ] File exists (it is NOT committed to GitHub — create it manually)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set (e.g. `https://xxxx.supabase.co`)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `NEXT_PUBLIC_API_URL` is set (use `http://localhost:8000` for local dev)

### Backend — `backend/.env`
- [ ] File exists (it is NOT committed to GitHub — create it manually)
- [ ] `SUPABASE_URL` is set
- [ ] `SUPABASE_SERVICE_KEY` is set (service role key, not anon key)
- [ ] `GROQ_API_KEY` is set (get one free at https://console.groq.com)
- [ ] `WHISPER_MODEL` is set to `tiny`

---

## 4. Supabase Setup

- [ ] Supabase project created at https://supabase.com
- [ ] SQL from `supabase_setup.sql` has been run in the **SQL Editor** (Supabase dashboard → SQL Editor → paste entire file → Run)
- [ ] Email confirmation is **disabled** for local dev (Supabase dashboard → Authentication → Providers → Email → uncheck "Confirm email")
- [ ] Supabase Storage bucket named `presentations` exists (Storage tab → New bucket → `presentations`, public: off)

---

## 5. Backend (FastAPI)

### Python virtual environment
- [ ] Virtual environment exists: `backend/venv/` folder is present
  - If not, run from project root:
    ```bash
    cd backend
    python -m venv venv
    ```

### Activate and install dependencies
- [ ] Activate venv:
  - **Windows:** `venv\Scripts\activate`
  - **Mac/Linux:** `source venv/bin/activate`
- [ ] Dependencies installed:
  ```bash
  pip install -r requirements.txt
  ```
  - If `requirements.txt` does not exist yet, install manually:
    ```bash
    pip install fastapi uvicorn python-multipart supabase
    pip install openai-whisper torch --extra-index-url https://download.pytorch.org/whl/cpu
    pip install mediapipe opencv-python-headless librosa spacy groq
    pip install apscheduler jiwer python-dotenv
    python -m spacy download en_core_web_sm
    pip freeze > requirements.txt
    ```
- [ ] spaCy English model downloaded: `python -m spacy download en_core_web_sm`

---

## 6. Frontend (Next.js)

- [ ] Node modules installed:
  ```bash
  cd frontend
  npm install
  ```
- [ ] No TypeScript errors shown in VS Code (check the Problems panel)

---

## 7. How to Run the App

Open **three separate terminal tabs/windows** in VS Code (`Ctrl+`` ` → then the `+` button to add tabs).

### Terminal 1 — Backend
```bash
cd backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
uvicorn main:app --reload
```
Expected output: `Uvicorn running on http://127.0.0.1:8000`

### Terminal 2 — Frontend
```bash
cd frontend
npm run dev
```
Expected output: `Ready - started server on http://localhost:3000`

### Terminal 3 — Claude Code (optional, for development)
```bash
cd C:\presentation-coach-fyp
claude
```

---

## 8. Verify Everything Works

After both servers are running, check each of these:

- [ ] **Frontend loads:** Open http://localhost:3000 — you should see the login/landing page
- [ ] **API docs load:** Open http://localhost:8000/docs — you should see the FastAPI Swagger UI
- [ ] **Register a test account:** Go to http://localhost:3000/register, pick a role (Student), fill in details, submit — should succeed without email confirmation
- [ ] **Login works:** Go to http://localhost:3000/login, log in with the test account — should redirect to dashboard
- [ ] **No console errors:** Open browser DevTools (`F12` → Console tab) — should have no red errors

---

## 9. Common Problems & Fixes

| Problem | Fix |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL is not defined` | Check `frontend/.env.local` exists and has the correct keys, then restart `npm run dev` |
| `ModuleNotFoundError` in backend | Make sure venv is activated before running uvicorn |
| `relation "users" does not exist` | Run `supabase_setup.sql` in Supabase SQL Editor |
| Port 3000 already in use | Kill the old process: `npx kill-port 3000` |
| Port 8000 already in use | Kill the old process: `npx kill-port 8000` |
| CORS error in browser console | Backend is not running — start uvicorn in Terminal 1 |
| Supabase auth "Email not confirmed" | Disable email confirmation in Supabase Auth settings (see Section 4) |
| `torch` install takes very long | This is normal — it is a large package (~200 MB). Let it finish. |

---

## 10. Quick Reference

| Action | Command |
|---|---|
| Start backend | `cd backend && uvicorn main:app --reload` |
| Start frontend | `cd frontend && npm run dev` |
| View app | http://localhost:3000 |
| View API docs | http://localhost:8000/docs |
| View Supabase tables | https://supabase.com → your project → Table Editor |
| Save work | `git add . && git commit -m "feat: ..." && git push` |
