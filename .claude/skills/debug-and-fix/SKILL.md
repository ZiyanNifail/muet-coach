---
name: debug-and-fix
description: Automated debug, fix, and re-test skill for the AI Presentation Coaching Tool. Use this skill whenever the user wants to fix issues, debug problems, or resolve errors found in the project — including phrases like "fix the issues", "debug this", "fix what the review found", "resolve the critical issues", "the project-review found problems fix them", "something is broken", "fix and test", "clean up the errors", "repair the project", "there are bugs fix them", or any request to correct problems identified in code. Also trigger when the user pastes an error message, a stack trace, or a list of issues from the project-review skill and wants them resolved. This skill reads the review report, fixes each issue in priority order, verifies the fix works, then produces a summary of what changed.
---

# Debug and Fix Skill
## AI Presentation Coaching Tool — Automated Repair Protocol

You are the repair agent. Your job is to take issues — either from the `project-review` skill's report, from a user-pasted error, or from your own inspection — fix each one in priority order, verify the fix actually works, then hand back a clear summary of what was done.

**You fix. You verify. You summarise. You do not ask permission for every line.**

---

## Step 0 — Gather the Issues

Determine where the issues are coming from. There are three possible sources:

### Source A — Project-Review Report
If the user says "fix what the review found" or similar, look for a review report in this order:
1. A file named `REVIEW_REPORT.md` in the project root
2. The most recent output from the `project-review` skill in the current session
3. If neither exists, tell the user: "I don't have a review report to work from. Run the project-review skill first, or paste the issues here."

### Source B — User-Pasted Issues
If the user pastes a list of issues, error messages, or stack traces directly into the chat, treat that as the issue list. Parse each item into the standard format before proceeding.

### Source C — No Report Yet
If the user says "fix issues" but has given you nothing to work from, run a quick targeted scan before fixing:
```bash
# Check for obvious errors — TypeScript, Python syntax, missing imports
cd frontend && npx tsc --noEmit 2>&1 | head -50
cd ../backend && python -m py_compile $(find . -name "*.py" | grep -v __pycache__ | grep -v venv) 2>&1
```
Use the output as your issue list.

---

## Step 1 — Parse and Prioritise Issues

Take every issue from the source and classify it. Use this exact priority order — never skip a Critical issue to work on a Warning:

| Priority | Label | Fix condition |
|---|---|---|
| 1st | 🔴 CRITICAL | Data errors, broken flows, security holes, unhandled exceptions, app crashes |
| 2nd | 🟡 WARNING | Spec mismatches, wrong behaviour, missing fallbacks, UI deviations |
| 3rd | ⬜ MISSING | Features not yet built (only attempt if user explicitly asks) |

Build a numbered fix queue before touching any code:

```
FIX QUEUE
─────────────────────────────────────────
[1] 🔴 CRIT-01  — [description]
[2] 🔴 CRIT-02  — [description]
[3] 🟡 WARN-01  — [description]
[4] 🟡 WARN-02  — [description]
─────────────────────────────────────────
Total: X critical, Y warnings
Starting with [1].
```

Print this queue so the user can see what you are about to do. Then begin immediately — do not wait for approval.

---

## Step 2 — Fix Each Issue

Work through the queue one item at a time. For each issue, follow this exact loop:

### 2A. Understand Before Touching

Read the relevant file(s) before editing. Never edit from memory.

```bash
# Read the file first
cat path/to/file.tsx
# or for Python
cat path/to/service.py
```

Identify the exact lines causing the problem.

### 2B. Apply the Fix

Make the minimal change that resolves the issue. Do not refactor, rename, or restructure code that is not broken. The fix should be surgical.

**For frontend (Next.js / TypeScript / Tailwind):**
- Fix TypeScript errors by correcting types, not by casting to `any`
- Fix missing imports by adding the correct import, not removing the usage
- Fix Tailwind class errors by using the correct utility class from DESIGN.md tokens
- Fix broken API calls by checking the endpoint signature in `backend/routers/`

**For backend (FastAPI / Python):**
- Fix import errors by installing the missing package and adding to `requirements.txt`
- Fix Pydantic validation errors by correcting the model field types
- Fix Supabase query errors by checking the actual table schema in `supabase_setup.sql`
- Fix unhandled exceptions by wrapping in try/except with a proper HTTP error response
- Fix route conflicts by checking all existing routes before adding a new one

**For environment / configuration:**
- Fix missing env vars by documenting them — never hardcode values
- Fix CORS errors by updating `allow_origins` in `main.py`
- Fix Supabase RLS errors by checking the policy in `supabase_setup.sql`

### 2C. Verify the Fix

After every fix, verify it actually works. Do not move to the next issue until the current one is confirmed resolved.

**TypeScript / Frontend verification:**
```bash
cd frontend
npx tsc --noEmit
# Should return with no errors for this file
```

**Python / Backend verification:**
```bash
cd backend
python -m py_compile path/to/fixed_file.py
# Should return silently (no output = no syntax errors)
```

**Import verification:**
```bash
cd backend
python -c "from services.fixed_module import FixedClass; print('OK')"
```

**API endpoint verification (if backend is running):**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health
# Should return 200
```

**Logic verification:** For business logic fixes (wrong calculation, wrong threshold, wrong field name), read the fixed code aloud mentally and confirm it matches the spec in `PRD.md` or `DESIGN.md`.

### 2D. Mark as Done

After verifying, log the fix:

```
✅ Fixed [CRIT-01 / WARN-01] — [one-line description of what changed]
   File: path/to/file  Line: X
   Change: [what was wrong → what it is now]
```

Then move immediately to the next item in the queue.

---

## Step 3 — Handle Fix Failures

Sometimes a fix attempt reveals a deeper problem. When this happens:

**If the fix introduces a new error:** Revert immediately, then investigate the root cause before trying again.

```bash
# Revert a single file to last committed state
git checkout -- path/to/file
```

**If the issue cannot be fixed without missing information** (e.g., a Supabase table column that doesn't exist, a missing API key, a feature that isn't built yet): Mark it as BLOCKED and document exactly what is needed:

```
⛔ BLOCKED [CRIT-02] — Cannot fix without: [specific thing needed]
   Required: [exact SQL migration / env var / missing task ID]
   Action for user: [one clear instruction]
```

**If fixing one issue reveals another:** Add the new issue to the end of the fix queue. Do not abandon the current queue.

**If a Critical issue is not fixable in this session** (e.g., requires the dataset that hasn't been collected, or a service that isn't deployed): Mark as DEFERRED with a clear explanation.

---

## Step 4 — Run Final Verification Pass

After all fixes are applied, run a full project health check to confirm nothing new broke:

```bash
# Frontend — full TypeScript check
cd frontend
npx tsc --noEmit 2>&1
echo "Frontend TS: exit $?"

# Frontend — lint
npx eslint . --ext .ts,.tsx --max-warnings 0 2>&1 | tail -5
echo "Frontend lint: exit $?"

# Backend — syntax check all Python files
cd ../backend
find . -name "*.py" \
  ! -path "./.venv/*" \
  ! -path "./venv/*" \
  ! -path "./__pycache__/*" \
  | xargs python -m py_compile 2>&1
echo "Backend syntax: exit $?"

# Backend — import check key services
python -c "
from services.pipeline import run_pipeline
from services.groq_service import get_advice
from services.whisper_service import transcribe
from services.mediapipe_service import analyse_video
print('All key imports: OK')
" 2>&1
```

If any of these return errors that were not present before your fixes, address them before producing the summary.

---

## Step 5 — Produce the Fix Summary Report

After all fixes and the final verification pass, generate this exact report:

```
╔══════════════════════════════════════════════════════════════╗
║              DEBUG & FIX SUMMARY REPORT                     ║
╚══════════════════════════════════════════════════════════════╝

Session: [date and time]
Issues received: [X critical, Y warnings, Z missing]

────────────────────────────────────────────────────────────────
✅  FIXED  ([count])
────────────────────────────────────────────────────────────────

[CRIT-01]  [Short description]
  File:    path/to/file.tsx
  Was:     [what the broken code looked like / what the error was]
  Now:     [what the fixed code does]
  Tested:  [how you verified it — tsc / py_compile / curl / logic check]

[CRIT-02]  [Short description]
  File:    path/to/file.py
  Was:     ...
  Now:     ...
  Tested:  ...

[WARN-01]  [Short description]
  ...

────────────────────────────────────────────────────────────────
⛔  BLOCKED  ([count])
────────────────────────────────────────────────────────────────

[CRIT-03]  [Short description]
  Reason:  [why it could not be fixed]
  Needs:   [exact thing required — SQL migration / env var / task ID]
  Action:  [one instruction for the user]

────────────────────────────────────────────────────────────────
⬜  NOT ATTEMPTED  ([count])
────────────────────────────────────────────────────────────────

[MISS-01]  [Feature not yet built — out of scope for this skill]
  Task:    [TASKLIST.md task ID, e.g. T2.12B]
  Status:  Not started — use Claude Code to build this feature

────────────────────────────────────────────────────────────────
🔍  FINAL HEALTH CHECK
────────────────────────────────────────────────────────────────

Frontend TypeScript:  [PASS / FAIL — X errors]
Frontend ESLint:      [PASS / FAIL — X warnings]
Backend syntax:       [PASS / FAIL — X files checked]
Backend imports:      [PASS / FAIL]

────────────────────────────────────────────────────────────────
📋  RECOMMENDED NEXT STEPS
────────────────────────────────────────────────────────────────

1. [Most important thing to do next — e.g. resolve BLOCKED issues]
2. [Second thing — e.g. run project-review again to confirm clean]
3. [Third thing — e.g. start building the next unbuilt feature from TASKLIST]

════════════════════════════════════════════════════════════════
```

---

## Behaviour Rules

**Fix, don't ask.** For every issue in the queue, attempt the fix. Do not ask "should I fix this?" — that is why the skill was triggered.

**Read before writing.** Never edit a file without reading it first in the same session. Code changes made from memory cause new bugs.

**One fix at a time.** Complete and verify each fix before starting the next. Do not batch-apply multiple fixes simultaneously.

**Minimal changes only.** Fix exactly what is broken. Do not improve, rename, or restructure surrounding code. If you notice something else broken while fixing, add it to the queue — do not fix it in place.

**Never delete working code.** If a fix requires removing a line, confirm the line is actually the problem. When in doubt, comment it out first and verify, then delete.

**Commit after every Critical fix.** After each Critical issue is resolved and verified, commit it:
```bash
git add -A
git commit -m "fix: [one-line description of what was fixed]"
```
This gives the user a clean git history and a rollback point.

**Missing features are not bugs.** If an issue is `⬜ NOT BUILT`, do not attempt to build the whole feature inside this skill. Note it as not attempted and point the user to the relevant TASKLIST task ID. Building new features belongs in a regular Claude Code session following the TASKLIST.

**If DESIGN.md, PRD.md, or TASKLIST.md are missing:** Warn the user that fixes will be made based on general best practices only, without the ability to verify against the project spec.

---

## Quick Reference — Common Fixes for This Project

These are the most frequently occurring issues in this specific stack. Use these as a starting point when diagnosing.

### Supabase RLS blocking a query
```python
# Symptom: 403 or empty result when data clearly exists
# Fix: Use service role client in backend, not anon client
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)  # not ANON_KEY
```

### Groq API rate limit hit
```python
# Symptom: 429 error from Groq
# Fix: Check the request queue is capped at 25/min not 30
# In groq_service.py — verify the semaphore or sleep interval
```

### Whisper loading on every request (slow)
```python
# Symptom: Each transcription takes 30+ seconds
# Fix: Lazy load — load model once at startup, reuse
# In whisper_service.py — model should be module-level, not inside the function
_model = None
def get_model():
    global _model
    if _model is None:
        _model = whisper.load_model(WHISPER_MODEL)
    return _model
```

### MediaPipe not finding face in frames
```python
# Symptom: eye_contact_pct always 0 or face_ok always False
# Fix: Check frame resizing — MediaPipe needs RGB not BGR
import cv2
frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
```

### Next.js hydration mismatch
```
# Symptom: "Hydration failed because the server rendered HTML didn't match"
# Fix: Wrap client-only components in a useEffect or dynamic import
import dynamic from 'next/dynamic'
const RecordingInterface = dynamic(() => import('@/components/RecordingInterface'), { ssr: false })
```

### Supabase Storage signed URL expiring mid-session
```python
# Symptom: Video stops playing after 1 hour
# Fix: Generate signed URL fresh on each page load, not cached
response = supabase.storage.from_('recordings').create_signed_url(path, 3600)
# Regenerate when user visits the review page, not when session is created
```

### CORS error on API call from Vercel to Railway
```python
# Symptom: "Access-Control-Allow-Origin" error in browser console
# Fix: In main.py, ensure Vercel domain is in allow_origins
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### WebRTC not recording audio on some browsers
```javascript
// Symptom: Audio waveform flat, transcript empty
// Fix: Prefer audio/webm;codecs=opus, fall back gracefully
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/webm'
```

### Railway running out of memory (Whisper + new models)
```
# Symptom: Railway container restarts unexpectedly
# Fix: Load sentiment model lazily same as Whisper
# Check: Whisper tiny ~390MB + DistilBERT ~250MB = ~640MB — near Railway 512MB limit
# Solution: Upgrade to Railway Hobby ($5/mo) or unload Whisper before loading sentiment
```
