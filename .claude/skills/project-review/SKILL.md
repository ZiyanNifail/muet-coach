---
name: project-review
description: Comprehensive project review skill for the AI Presentation Coaching Tool. Use this skill whenever the user asks to review, audit, check, inspect, or validate the project — including phrases like "check if this is okay", "review the project", "is the flow correct", "check the UI", "audit the modules", "does this make sense", "validate the student flow", "validate the educator flow", or any request to verify that what has been built matches the PRD, TASKLIST, and DESIGN spec. Also trigger when the user asks about specific module quality: "is the educator dashboard right", "does the practice session flow work", "check the recording interface". This skill runs a structured, multi-pass inspection across module flow, UI/UX, code quality, and PRD alignment — then produces a prioritised fix report.
---

# Project Review Skill
## AI Presentation Coaching Tool — Structured Inspection Protocol

You are conducting a full project review. Your job is to systematically inspect what has been built, compare it against the project's three source-of-truth documents, and produce a clear, prioritised report of what is correct, what is broken, and what is missing.

---

## Step 0 — Load Source of Truth

Before inspecting any code, read these files in full:

```
1. PRD.md          — functional requirements, DB schema, acceptance criteria
2. TASKLIST.md     — all tasks, their status, dependencies, and notes
3. DESIGN.md       — UI/UX spec: colours, components, layouts, animations
```

If any of these files are missing, stop and tell the user: "I cannot run a review without [missing file]. Please ensure PRD.md, TASKLIST.md, and DESIGN.md are in the project root."

---

## Step 1 — Map the Project Structure

Walk the project directory tree. Build a mental map of what exists:

```bash
# Run this to see the full structure
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.py" \) \
  | grep -v node_modules \
  | grep -v __pycache__ \
  | grep -v .next \
  | sort
```

Then identify:
- Which pages exist in `frontend/app/`
- Which components exist in `frontend/components/`
- Which API routes exist in `backend/routers/`
- Which services exist in `backend/services/`

Cross-reference against the **Page Map** in DESIGN.md Section 10 and the **project structure** in SETUP.md. Note every page or route that is expected but missing.

---

## Step 2 — Module Flow Review

Inspect each user flow end-to-end. For each flow, trace the path from the first user action to the final output, reading the actual code at each step.

### 2A. Student Registration & Onboarding Flow

Expected path per TASKLIST T2.01 → T2.01A → T2.01B → T2.02:

```
/auth/register
  → Role selector rendered? (Student card / Educator card)
  → On Student select: form submits, role='student' saved to users table
  → On Educator select: pending approval state shown, educator_approvals record created
  → Supabase Auth session created
  → Consent screen shown on first login (consent_log written)
  → Redirect to /dashboard
```

Check for:
- [ ] Role selector UI exists and matches DESIGN.md Section 6.2
- [ ] `users.role` is set correctly on registration
- [ ] Educator pending state renders the amber banner
- [ ] `educator_approvals` table record is created for educators
- [ ] Consent modal appears before any dashboard content loads
- [ ] `consent_log` table receives a record on acceptance
- [ ] First-time vs returning user logic is correct (consent not shown twice)

### 2B. Student Practice Session Flow

Expected path per TASKLIST T2.05A → T2.05B → T2.05C → T2.05D:

```
/practice
  → Mode selector: Unguided card / Guided card
  → On select: session_mode saved, topic wheel modal opens
  → Topic wheel spins, locks on random topic from muet_topics table
  → Brainstorm panel: 1-min timer counts down, textarea available
  → Timer reaches 0 (or user clicks Ready): recording interface loads
  → WebRTC starts: webcam feed shown, audio waveform active
  → Guided mode only: real-time warning overlays trigger on rule violations
  → Stop & Analyse: video/audio uploaded to FastAPI
  → Processing: Whisper → MediaPipe → Groq → report assembled
  → Redirect to /results/[id]
```

Check for:
- [ ] Mode selector exists with correct copy (Unguided = baseline, Guided = coached)
- [ ] `session_mode` is saved to `presentations` table
- [ ] Topic wheel fetches from `muet_topics` table (not hardcoded)
- [ ] Wheel spin animation uses `cubic-bezier(0.15, 0.85, 0.4, 1)` per DESIGN.md
- [ ] Blurred rows above/below locked topic are implemented
- [ ] `topic_id` is saved to session record after selection
- [ ] Brainstorm timer starts at 1:00 and counts down
- [ ] Timer colour transitions: green → amber at 0:20 → red at 0:10
- [ ] Brainstorm notes saved to `presentations.brainstorm_notes` (not sent to AI)
- [ ] WebRTC records as `.webm` (video) and `.wav` (audio)
- [ ] Audio waveform is live during recording (not static/fake)
- [ ] Guided mode: warning overlay component exists
- [ ] Guided mode: at least WPM and eye contact warnings trigger correctly
- [ ] Unguided mode: zero overlays during recording
- [ ] Upload sends multipart POST to `/api/presentations/upload`
- [ ] Upload retry logic exists (3× exponential backoff)

### 2C. Feedback Results Flow

Expected path per TASKLIST T2.19 → T3.04 → T3.05 → T3.06 → T3.07:

```
/results/[id]
  → Band score ring displayed (CEFR 1.0–6.0)
  → Metric cards: WPM, eye contact %, posture score, filler count
  → Transcript panel with semantic highlighting (green = vocab, red = fillers)
  → WPM pace line chart with 130/150 WPM reference lines
  → Posture badge: Good / Needs Work / Poor
  → Advice cards (max 5, from Groq or fallback)
  → Session mode and topic name shown as context
```

Check for:
- [ ] Band score ring is the primary visual anchor (top centre)
- [ ] All 4 metric cards rendered
- [ ] Transcript highlights filler words in red
- [ ] Transcript highlights strong vocabulary in green
- [ ] WPM chart renders `pace_timeseries` from the report (not dummy data)
- [ ] Reference lines at 130 and 150 WPM on the chart
- [ ] Posture badge colour matches the score threshold (≥70 = Good, 40–69 = Needs Work, <40 = Poor)
- [ ] Advice cards render from `advice_cards` JSON field
- [ ] If `confidence_flags.audio_ok = false`, audio metrics show "N/A" not a score
- [ ] If `confidence_flags.face_ok = false`, visual metrics show "N/A" not a score
- [ ] Groq fallback advice renders if `advice_cards` is empty

### 2D. Progress Tracking Flow

Expected path per TASKLIST T3.08 → T3.09 → T3.10:

```
/progress
  → Band score timeline chart (all sessions, ordered by date)
  → 4 sparkline trend charts (filler, eye contact, WPM, posture)
  → Session comparison: select 2 sessions → side-by-side diff table
```

Check for:
- [ ] Timeline chart queries `session_history` + `feedback_reports` for the logged-in student only
- [ ] MUET band reference lines annotate the timeline chart
- [ ] Sparklines show trend direction correctly (last 2 sessions compared)
- [ ] Green up-arrow for improvement, amber down-arrow for decline
- [ ] Session comparison dropdown populates with past sessions
- [ ] Diff table shows +/- change per metric between selected sessions

### 2E. Educator Flow

Expected path per TASKLIST T2.01B → T4.01 → T4.01A → T4.01B → T4.01C → T4.02 → T4.04 → T4.05:

```
/admin
  → Pending educator list rendered
  → Approve / Reject actions work
  → Approved educator: role unlocked, redirected to /educator/dashboard

/educator/dashboard
  → Course list in sidebar
  → Class analytics panel (avg WPM, band, filler words, eye contact, posture)
  → Analytics grouped by assignment, filterable by date range / student

/educator/courses/[id]
  → Student roster with join status
  → Pending join requests panel (approve / reject)
  → Assignment list

/educator/review/[id]
  → Video player (Supabase Storage signed URL)
  → AI metrics panel alongside video
  → HITL override form: new band score + written feedback
  → Submit writes to educator_overrides, notifies student
```

Check for:
- [ ] Admin route is protected — only `role = 'admin'` can access
- [ ] Educator dashboard is protected — blocked until `educator_approvals.status = 'approved'`
- [ ] Course creation form saves to `courses` table with auto-generated invite code
- [ ] Student invite by email creates pending `course_members` record
- [ ] Student join-by-code flow creates pending `course_members` record
- [ ] Educator sees pending join requests and can approve/reject
- [ ] `course_members.status` updates correctly on educator response
- [ ] Class analytics are aggregated at assignment level (not just per-student)
- [ ] Analytics show anonymised data (no raw student names in aggregate views)
- [ ] Video player uses Supabase signed URL (not a public URL)
- [ ] HITL override saves to `educator_overrides` table
- [ ] Original AI report is preserved after override (not overwritten)
- [ ] Student receives notification after educator submits override

---

## Step 3 — UI/UX Review

For each page that exists, inspect its implementation against DESIGN.md.

### 3A. Global Design Token Compliance

Open `tailwind.config.js` or the global CSS file. Check:

- [ ] `--bg-base: #0a0a0f` is defined
- [ ] `--bg-panel: rgba(18, 18, 28, 0.75)` is defined
- [ ] `--bg-surface: rgba(255, 255, 255, 0.04)` is defined
- [ ] `backdrop-filter: blur(12px)` applied to panels
- [ ] `--text-primary: #e8e8f0` used for body text (not white #ffffff)
- [ ] `--text-secondary: #8888a0` used for labels and metadata
- [ ] `--text-tertiary: #55556a` used for placeholders
- [ ] Section labels (KNOWLEDGE GRAPH style) use: `font-size: 10px`, `letter-spacing: 0.12em`, `text-transform: uppercase`
- [ ] Accent colours match DESIGN.md exactly: green `#22c55e`, amber `#f59e0b`, red `#ef4444`, blue `#3b82f6`, purple `#8b5cf6`
- [ ] Font family is Inter or SF Pro Display (not Arial, Roboto, or system-ui fallback only)
- [ ] Monospace font (JetBrains Mono or Fira Code) used for all metric values

### 3B. Panel & Card Consistency

Sample 3 different panels across different pages. For each check:

- [ ] `background: var(--bg-panel)` or equivalent Tailwind class
- [ ] `border: 1px solid var(--border-subtle)` (not a heavier border)
- [ ] `border-radius: 12px` for panels, `8px` for cards
- [ ] `backdrop-filter: blur(12px)` present
- [ ] Hover state changes `border-color` to `--border-medium`
- [ ] No solid white or black backgrounds on any panel

### 3C. Status Indicator Dots

Check recording interface and any live-status cards:

- [ ] Active recording dot uses `--dot-active: #22c55e`
- [ ] Active dot has `box-shadow: 0 0 6px #22c55e`
- [ ] Active dot pulses (CSS `animation: pulse 2s ease-in-out infinite`)
- [ ] Processing state uses `--dot-processing: #f59e0b`
- [ ] Completed state uses `--dot-complete: #3b82f6`

### 3D. Metric Cards

Check the student dashboard and results page metric cards:

- [ ] Label: 10px, 600 weight, uppercase, letter-spacing 0.1em, `--text-tertiary` colour
- [ ] Value: monospace font, 24px, 600 weight, `--text-primary` colour
- [ ] Sub-label: 12px, `--text-secondary` colour
- [ ] Card background: `--bg-surface`
- [ ] Card border: `--border-subtle`

### 3E. Button Consistency

Find primary buttons (Start Practice, Submit, Approve) and secondary buttons (Skip, Cancel):

- [ ] Primary: `background: #3b82f6`, white text, `border-radius: 8px`, `padding: 9px 18px`
- [ ] Primary hover: `opacity: 0.88` (not a different colour)
- [ ] Secondary: transparent background, `--border-medium` border, `--text-secondary` text
- [ ] Secondary hover: `--border-strong` border, `--text-primary` text
- [ ] No button uses a gradient background
- [ ] Danger buttons: `--accent-red-dim` background, `--accent-red` text

### 3F. Warning Overlays (Guided Mode)

If guided mode is implemented, check the warning overlay component:

- [ ] `position: absolute`, `top: 12px`, centred horizontally
- [ ] `background: rgba(245, 158, 11, 0.15)` (amber dim)
- [ ] `border: 1px solid rgba(245, 158, 11, 0.35)`
- [ ] `backdrop-filter: blur(8px)` on overlay
- [ ] Slide-in animation: `translateY(-8px → 0)` over 250ms
- [ ] Auto-dismisses after 4 seconds
- [ ] Does NOT appear in unguided mode under any circumstance

### 3G. Topic Wheel

If topic wheel is implemented:

- [ ] Modal has a dark background matching panel spec
- [ ] Locked (selected) row: full `--text-primary`, border top/bottom in `--border-medium`
- [ ] Non-locked rows: `filter: blur(1.5px)`, `color: --text-tertiary`, `opacity: 0.5`
- [ ] Spin animation uses `cubic-bezier(0.15, 0.85, 0.4, 1)` easing
- [ ] Spin duration is randomised between 1500ms and 2500ms (not fixed)
- [ ] "Spin Again" re-randomises the topic (not just re-animates the same one)

### 3H. Brainstorm Timer

If brainstorm panel is implemented:

- [ ] Timer starts at 1:00 (60 seconds)
- [ ] Timer colour is green above 0:20
- [ ] Timer transitions to amber at exactly 0:20
- [ ] Timer transitions to red at exactly 0:10
- [ ] At 0:00: auto-advances without user action
- [ ] Textarea placeholder text is present and helpful
- [ ] Note is saved to `presentations.brainstorm_notes` on advance
- [ ] A visible disclaimer states notes are not assessed by AI

---

## Step 4 — API & Backend Review

### 4A. FastAPI Endpoints

List all routes in `backend/routers/`. Check each against the expected endpoints from TASKLIST T4.08:

Expected endpoints:
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/me
POST   /api/presentations/upload
GET    /api/presentations/{id}
GET    /api/reports/{id}
GET    /api/reports/student/{student_id}
GET    /api/courses
POST   /api/courses
GET    /api/courses/{id}/members
POST   /api/courses/{id}/join-request
PATCH  /api/courses/{id}/members/{student_id}
GET    /api/analytics/class/{course_id}
GET    /api/admin/educator-approvals
PATCH  /api/admin/educator-approvals/{id}
```

For each route that exists, check:
- [ ] Route is protected by auth middleware (no public access to user data)
- [ ] Role check enforced where needed (educator routes reject students, admin routes reject non-admins)
- [ ] Returns appropriate HTTP status codes (not always 200)
- [ ] Error responses are JSON with a `detail` field (FastAPI standard)

### 4B. AI Pipeline Services

Check `backend/services/` for each service:

**whisper_service.py**
- [ ] Uses `openai-whisper` (not another library)
- [ ] Model is loaded from env var `WHISPER_MODEL` (not hardcoded)
- [ ] Audio is chunked into 60-sec segments before transcription
- [ ] Chunks are transcribed individually and concatenated
- [ ] SNR check performed; low SNR sets `confidence_flags.audio_ok = false`

**mediapipe_service.py**
- [ ] Face Mesh processes extracted frames (not live video)
- [ ] Eye contact computed as % of frames where Euler angles within ±15° of camera
- [ ] Pose landmarks processed from same frame batch as Face Mesh (no double extraction)
- [ ] Posture score formula: `100 - (head_tilt_deg * 2) - (shoulder_diff_px / 5)`
- [ ] No face in >80% of frames sets `confidence_flags.face_ok = false`

**groq_service.py**
- [ ] Uses Groq API (not OpenAI or Gemini)
- [ ] Model is `llama-3.3-70b-versatile` or equivalent Llama 3.3
- [ ] System prompt includes MUET/CEFR rubric descriptors (not generic)
- [ ] `session_mode` is included in the prompt context
- [ ] Request queue limits to 25 req/min (not 30, to stay safely under free tier)
- [ ] On API failure: falls back to rule-based advice strings (not an unhandled exception)
- [ ] Response is parsed as structured JSON (not freeform text)

**cefr_evaluator.py**
- [ ] Band thresholds are loaded from a constants file (not hardcoded in logic)
- [ ] Band 5 thresholds: 130–150 WPM, eye contact ≥60%, filler <5/min, posture ≥70
- [ ] Metrics flagged N/A (from confidence_flags) are excluded from band calculation
- [ ] Final band score is a float (e.g. 4.5), not an integer

### 4C. Supabase Integration

Check `backend/` and `frontend/lib/supabase.ts`:

- [ ] Frontend uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Backend uses `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service role, not anon)
- [ ] RLS is enabled on all tables (verify by checking Supabase dashboard or migration files)
- [ ] Students cannot query other students' `feedback_reports`
- [ ] Storage bucket policy prevents cross-user file access
- [ ] Signed URLs used for video playback (not public URLs)

---

## Step 5 — Security & Environment Check

- [ ] `.env` and `.env.local` are in `.gitignore`
- [ ] No API keys appear anywhere in committed code (search for `GROQ_API_KEY`, `SUPABASE_SERVICE_KEY`)
- [ ] Filenames in Supabase Storage use UUIDs (not student names or readable identifiers)
- [ ] File upload validates type (video/webm only) and size (max defined in code)
- [ ] Consent is checked server-side before any analysis runs (not just client-side)

Run this search to catch accidental key exposure:
```bash
grep -r "gsk_\|sk-\|eyJ" --include="*.ts" --include="*.tsx" --include="*.py" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=venv .
```
If this returns any results, flag them as critical security issues.

---

## Step 6 — Produce the Review Report

After completing Steps 1–5, generate a structured report in this exact format:

---

```
# PROJECT REVIEW REPORT
Generated: [date]
Reviewer: Claude Code — project-review skill

## SUMMARY
- Pages built: X of Y expected
- Flows complete: X of 5
- UI/UX checks passed: X of Y
- Critical issues: X
- Warnings: X
- Missing features: X

---

## 🔴 CRITICAL ISSUES
> These will break the app or cause data errors. Fix before testing.

[CRIT-01] [Area] Description of issue
  File: path/to/file.tsx line X
  Expected: what it should do
  Actual: what it does / what's missing
  Fix: specific action to take

---

## 🟡 WARNINGS
> These work but don't meet the spec. Fix before pilot.

[WARN-01] [Area] Description
  File: path/to/file
  Expected: ...
  Actual: ...
  Fix: ...

---

## 🟢 PASSED
> These match the PRD, TASKLIST, and DESIGN spec.

[PASS-01] [Area] What was checked and confirmed correct
...

---

## ⬜ NOT YET BUILT
> Features in TASKLIST.md with status [ ] that are not yet implemented.

[MISS-01] Task ID: T2.05B — Topic scroll wheel modal
  Phase: 2
  Priority: 🔴 High
  Blocking: T2.05C, T2.05D

---

## RECOMMENDED FIX ORDER
1. [CRIT issues in order of severity]
2. [WARN issues blocking pilot study]
3. [MISS issues required for Excellent/Distinction grade]
```

---

## Behaviour Rules

- **Never guess.** If you cannot find a file or confirm a check, mark it as `UNKNOWN` and say which file you were looking for.
- **Read actual code.** Do not assume something works because a file exists. Open the file and verify the logic.
- **One issue per entry.** Do not bundle multiple problems into one report item.
- **Be specific about file paths and line numbers.** Vague reports are not actionable.
- **Preserve what works.** Do not suggest refactoring code that passes all checks — only flag genuine issues.
- **Do not fix during review.** This skill is for inspection only. After the report is generated, ask the user: "Would you like me to fix the critical issues now, or review the full report first?"
