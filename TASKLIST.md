# Project Tasklist
## AI-Driven Multimodal Presentation Coaching Tool

> **Version:** 4.0 — Updated with new components (role-based auth, course management, session modes, topic wheel, brainstorm panel)
> **Author:** Ziyan Nifail (012024091602)
> **Supervisor:** Assoc. Prof. Ts. Dr Muhammad Irsyad Abdullah
> **Institution:** Management and Science University (MSU) — FYP 2025
> **Stack:** Next.js · FastAPI · Supabase · Railway · Vercel · Groq (Llama 3.3) · Whisper · MediaPipe

---

## Status Legend

| Symbol | Meaning |
|---|---|
| `[ ]` | Not Started |
| `[~]` | In Progress |
| `[x]` | Done |
| `[-]` | Deferred (v2.0) |

## Priority Legend

| Label | Meaning |
|---|---|
| 🔴 High | Blocks other tasks or directly tied to an objective |
| 🟡 Medium | Important but not blocking |
| 🟢 Low | Nice-to-have within scope |

---

## New Components Added in v4.0

The following features requested were checked against the existing tasklist. All 5 are **new** and have been added as dedicated tasks:

| # | New Feature | Added As | Phase |
|---|---|---|---|
| 1 | Role selection on register + Admin approval for Educator accounts | T2.01A, T2.01B, T2.01C | Phase 2 |
| 2 | Educator course management: invite students / student join requests | T4.01A, T4.01B, T4.01C | Phase 4 |
| 3 | Unguided session (baseline, AI assesses post-session only) | T2.05A | Phase 2 |
| 4 | Guided session (real-time warnings/popups during recording) | T2.05B | Phase 2 |
| 5 | Topic scroll wheel + 1-minute brainstorm panel before recording | T2.05C, T2.05D | Phase 2 |

---

## Phase 1 — Requirements, Design & Data Setup
**Duration:** Month 1–2
**Goal:** Finalise all planning artefacts, set up the development environment, and begin Malaysian English dataset collection.

| Task ID | Description | Obj | Priority | Effort | Status | Dependencies | Notes |
|---|---|---|---|---|---|---|---|
| T1.01 | Review & finalise FYP proposal with supervisor | SDO | 🔴 High | 3 days | `[x]` | — | Proposal approved. |
| T1.02 | Conduct full literature review (AIEd, ASR, CV, NLP, MUET/CEFR) | SDO | 🔴 High | 10 days | `[x]` | T1.01 | 2020–2025 sources. Covers Whisper, MediaPipe, ZPD, Bandura. |
| T1.03 | Conduct semi-structured interviews with MUET/SPM educators (n=3) | MIO/TEO | 🔴 High | 5 days | `[ ]` | T1.01 | Captures tacit grading knowledge for Groq/Llama 3.3 system prompt design. |
| T1.04 | Define functional & non-functional requirements (PRD v3.0) | SDO | 🔴 High | 4 days | `[x]` | T1.02, T1.03 | This document. All advisory improvements + v3.0 stack update. |
| T1.05 | Design DB schema: all tables, fields, relationships, JSONB structures | SDO | 🔴 High | 3 days | `[ ]` | T1.04 | See PRD Section 8. Updated to include: `muet_topics`, `courses`, `course_members`, `educator_approvals` tables. |
| T1.06 | Design Use Case Diagram (Student + Educator + Admin actors) | SDO | 🔴 High | 2 days | `[x]` | T1.05 | Updated: Admin actor added for educator approval flow. |
| T1.07 | Design Class Diagram | SDO | 🔴 High | 2 days | `[x]` | T1.06 | |
| T1.08 | Design Sequence Diagram (feedback review flow) | SDO | 🟡 Medium | 2 days | `[x]` | T1.07 | |
| T1.09 | Design Activity Diagram (full workflow including consent, topic wheel, brainstorm) | SDO | 🟡 Medium | 2 days | `[x]` | T1.08 | Updated: topic wheel + brainstorm steps added to session flow. |
| T1.10 | Create UI wireframes: all pages from DESIGN.md page map | SDO | 🔴 High | 5 days | `[ ]` | T1.04 | Pages: register (role select), dashboard, practice (mode → wheel → brainstorm → record), results, progress, educator dashboard, admin panel. |
| T1.11 | Set up development environment: VS Code, Python 3.11, Node.js 20, Git | SDO | 🔴 High | 1 day | `[ ]` | — | No GPU required. CPU-only stack. |
| T1.12 | Scaffold Next.js frontend project; push to GitHub; connect to Vercel | SDO | 🔴 High | 1 day | `[x]` | T1.11 | Done. Next.js 16 + Tailwind v4 + route groups `(auth)` `(student)`. |
| T1.13 | Scaffold FastAPI backend project; push to GitHub; connect to Railway | SDO | 🔴 High | 1 day | `[x]` | T1.11 | Done. FastAPI + uvicorn + all routers scaffolded. |
| T1.14 | Set up Supabase project: create all DB tables, configure RLS policies, create Storage bucket | SDO | 🔴 High | 2 days | `[x]` | T1.05, T1.12 | Done. `supabase_setup.sql` run; all tables + RLS created. |
| T1.15 | **[NEW]** Seed `muet_topics` table with ~40 MUET-relevant topics | SDO | 🔴 High | 1 day | `[x]` | T1.14 | Done. 30 topics seeded in `supabase_setup.sql`. |
| T1.16 | Collect Malaysian English speech samples (target: 60 recordings, ~100–150 min) | MIO | 🔴 High | 10 days | `[ ]` | T1.02 | Sources: MSU volunteers, AESRC2020, Mozilla Common Voice. |
| T1.17 | Annotate speech samples with human transcriptions for WER benchmarking | MIO | 🔴 High | 7 days | `[ ]` | T1.16 | Use `jiwer`. Gate: Whisper `tiny` WER ≤15%. |

---

## Phase 2 — Core System Development: Auth, Student Module & AI Pipeline
**Duration:** Month 3–6
**Goal:** Build registration with role selection, admin approval flow, both session modes, topic wheel, brainstorm panel, and the full AI pipeline.

| Task ID | Description | Obj | Priority | Effort | Status | Dependencies | Notes |
|---|---|---|---|---|---|---|---|
| T2.01 | Implement base auth using Supabase Auth: registration, login, logout, session management | SDO | 🔴 High | 2 days | `[x]` | T1.14 | Done. `lib/auth.ts` — signUp, signIn, signOut, getAppUser. |
| T2.01A | **[NEW]** Build role selection UI on registration page: two large cards (Student / Educator) matching DESIGN.md Section 6.2 | SDO | 🔴 High | 2 days | `[x]` | T2.01 | Done. `app/(auth)/register/page.tsx` with GraduationCap/ClipboardList lucide icons. |
| T2.01B | **[NEW]** Build Admin approval flow: create `educator_approvals` table; when educator registers, insert pending record; Admin dashboard shows approval queue with Approve / Reject buttons | SDO | 🔴 High | 3 days | `[x]` | T2.01A | Done. `educator_approvals` table + pending banner on register. |
| T2.01C | **[NEW]** Build Admin panel page `/admin`: table of pending educator registrations with name, email, institution, submitted date; Approve / Reject actions; approval triggers email notification via Supabase email | SDO | 🔴 High | 3 days | `[x]` | T2.01B | Done. `app/(student)/admin/page.tsx` + real `routers/admin.py` Supabase CRUD. Approve sets `users.role=educator`. |
| T2.02 | Build consent screen UI: checkbox + Accept button; block recording until accepted; write to `consent_log` | SDO | 🔴 High | 2 days | `[x]` | T2.01 | Done. `ConsentModal.tsx` — blocks dashboard until accepted. |
| T2.03 | Build Student Dashboard: Key Metric Cards (Band Score, Practice Hours, Sessions), sidebar nav, Start Practice CTA | SDO | 🔴 High | 4 days | `[x]` | T2.01 | Done. `app/(student)/dashboard/page.tsx`. |
| T2.04 | Implement PDF slide upload: drag-and-drop + button, PDF-only validation, max 20 MB, upload to Supabase Storage | SDO | 🔴 High | 2 days | `[x]` | T2.03 | Done. Slide upload step in `PracticeContent.tsx` (between brainstorm → recording). PDF-only validation, 20MB cap, drag-and-drop. Uploaded as `slides` field in multipart POST; saved to `uploads/{id}/slides.pdf`. |
| T2.05A | **[NEW]** Build Practice Mode Selector page: two cards (Unguided / Guided) matching DESIGN.md Section 6.3; selecting a mode saves `session_mode` to session record and advances to topic wheel | SDO | 🔴 High | 2 days | `[x]` | T2.03 | Done. In `PracticeContent.tsx`. |
| T2.05B | **[NEW]** Build Topic Scroll Wheel modal: fetch all topics from `muet_topics` table; animate scroll using `cubic-bezier(0.15, 0.85, 0.4, 1)`; lock onto random topic after 1.5–2.5s spin; "Spin Again" and "Use This Topic" buttons; save `topic_id` to session record | SDO | 🔴 High | 4 days | `[x]` | T2.05A, T1.15 | Done. `components/TopicWheel.tsx`. Blur-on-rows, proper initial render. |
| T2.05C | **[NEW]** Build Brainstorm Panel: 1-minute countdown timer; textarea for student notes; timer colour transitions (green → amber at 0:20 → red at 0:10); "Skip" and "I'm Ready" buttons; auto-advance at 0:00; save notes to `presentations.brainstorm_notes` field | SDO | 🔴 High | 3 days | `[x]` | T2.05B | Done. `components/BrainstormPanel.tsx`. |
| T2.05D | **[NEW]** Build Recording Interface: webcam feed via WebRTC, audio waveform visualiser (Web Audio API), countdown progress bar, Pause/Stop buttons; behaviour differs by `session_mode`: `unguided` = no overlays; `guided` = real-time warning overlays enabled | SDO | 🔴 High | 7 days | `[x]` | T2.05C | Done. `components/RecordingInterface.tsx`. MediaRecorder + Web Audio API waveform. |
| T2.05E | **[NEW]** Build Guided Mode real-time analysis: during recording, sample MediaPipe output every 5 seconds; trigger warning overlays based on rules table in DESIGN.md Section 6.6 (WPM too fast/slow, eye contact lost, filler word burst, no face detected) | MIO | 🔴 High | 5 days | `[x]` | T2.05D, T2.14 | Done. `RecordingInterface.tsx` — Web Speech API (SpeechRecognition) for real-time WPM + filler detection; canvas frame sampling for face presence; all warnings fire as overlays. |
| T2.06 | Implement upload-to-backend flow: multipart POST to FastAPI; progress bar; retry logic (3× exponential backoff: 5s, 10s, 20s) | SDO | 🔴 High | 3 days | `[x]` | T2.05D | Done. XHR upload with progress, 3× retry, status polling in `PracticeContent.tsx`. |
| T2.07 | Implement bandwidth check on recording start: warn if <2 Mbps (non-blocking) | SDO | 🟡 Medium | 2 days | `[x]` | T2.05D | Done. `navigator.connection.downlink` check + low-bandwidth warning banner. |
| T2.08 | Implement audio preprocessing: noise reduction, normalisation, 60-sec chunking | MIO | 🔴 High | 5 days | `[x]` | T2.06 | Done. `services/audio_service.py` — ffmpeg WAV extraction + chunking. |
| T2.09 | Implement video preprocessing: extract frames at 5 FPS, resize to 480p | MIO | 🔴 High | 3 days | `[x]` | T2.06 | Done. `services/video_service.py` — OpenCV frame extraction. |
| T2.10 | Integrate Whisper `tiny` in FastAPI: transcribe each audio chunk, concatenate transcript | MIO | 🔴 High | 5 days | `[x]` | T2.08 | Done. `services/whisper_service.py` — lazy model load, ThreadPoolExecutor. |
| T2.11 | Benchmark Whisper `tiny` WER on Malaysian English dataset; verify ≤15% | MIO | 🔴 High | 3 days | `[ ]` | T1.17, T2.10 | Manual task — deferred until dataset collected. |
| T2.12 | Implement filler word detection from transcript (`um`, `uh`, `ah`, `like`, `you know`) | MIO | 🔴 High | 3 days | `[x]` | T2.10 | Done. `services/nlp_service.py` — word-level pass, marks `[um]` in transcript. |
| T2.13 | Implement WPM calculation per chunk; store as JSON time-series | MIO | 🔴 High | 2 days | `[x]` | T2.10 | Done. `services/nlp_service.py` — `pace_timeseries` + `wpm_avg`. |
| T2.14 | Integrate MediaPipe Face Mesh: 468 landmarks, compute eye contact % via Euler angles | MIO | 🔴 High | 6 days | `[x]` | T2.09 | Done. `services/mediapipe_service.py` — nose-X centring ±15% threshold. |
| T2.15 | Integrate MediaPipe Pose: 33 landmarks, compute posture score (0–100) | MIO | 🔴 High | 5 days | `[x]` | T2.09 | Done. `services/mediapipe_service.py` — `100 - tilt*2 - shoulder_diff/5`. |
| T2.16 | Build CEFR Evaluation Layer: map all metrics → Band 1–6 | MIO | 🔴 High | 5 days | `[x]` | T2.12, T2.13, T2.14, T2.15 | Done. `services/cefr_evaluator.py` — rule-based band 1.0–6.0. |
| T2.17 | Implement confidence scoring + fallback flags (SNR, face detection) | MIO | 🔴 High | 4 days | `[x]` | T2.14, T2.15 | Done. `{audio_ok, face_ok, pose_ok}` assembled in `services/pipeline.py`. |
| T2.18 | Build Groq API fallback: rule-based advice strings if Groq fails | SDO | 🔴 High | 3 days | `[x]` | T2.16 | Done. `FALLBACK_ADVICE` in `services/groq_service.py`. |
| T2.19 | Build feedback report assembly: aggregate all metrics → persist to `feedback_reports` | SDO | 🔴 High | 4 days | `[x]` | T2.16, T2.17 | Done. `services/pipeline.py` orchestrator → `feedback_reports` + `session_history`. |

---

## Phase 3 — NLP, Feedback Dashboard & Progress Tracking
**Duration:** Month 7–8
**Goal:** Integrate Groq/Llama 3.3 for rubric-aligned advice. Build full Feedback Dashboard and Longitudinal Progress Tracking. Unguided vs Guided reports are identical in structure — `session_mode` is displayed as context only.

| Task ID | Description | Obj | Priority | Effort | Status | Dependencies | Notes |
|---|---|---|---|---|---|---|---|
| T3.01 | Design Groq/Llama 3.3 system prompt: embed MUET/CEFR rubric, band descriptors, output JSON schema | MIO | 🔴 High | 5 days | `[x]` | T1.03 | Done. `SYSTEM_PROMPT` in `services/groq_service.py`. JSON schema enforced via `response_format`. |
| T3.02 | Integrate Groq API: `pip install groq`; send transcript + metrics → Llama 3.3 70B; parse JSON; implement 25 req/min queue | MIO | 🔴 High | 5 days | `[x]` | T3.01 | Done. `services/groq_service.py` — groq v1.1.1 installed. Falls back to rule-based on failure. |
| T3.03 | Implement spaCy NLP pipeline: type-token ratio (TTR) for lexical diversity | MIO | 🟡 Medium | 4 days | `[x]` | T2.10 | Done. `compute_lexical_diversity()` in `services/nlp_service.py` (pure-Python TTR, no spaCy dep). |
| T3.04 | Build Feedback Results page: CEFR Band ring, metric cards, transcript panel with highlights | SDO | 🔴 High | 6 days | `[x]` | T2.19, T3.02 | Done. SVG CEFR band ring (score 1–6 arc), WPM chart, posture bar, PDF export, advice cards. |
| T3.05 | Implement WPM pace line chart (Recharts LineChart) with 130/150 WPM reference lines | SDO | 🔴 High | 2 days | `[x]` | T2.13, T3.04 | Done. Recharts LineChart with `ReferenceLine` at 130 (amber) and 150 (red). |
| T3.06 | Display posture score: badge (Good/Needs Work/Poor) + progress bar + explanation | SDO | 🔴 High | 2 days | `[x]` | T2.15, T3.04 | Done. `PostureBar` component — coloured progress bar + score/100 label. |
| T3.07 | Implement Actionable Advice Cards (max 5 from Groq; fallback to rule-based) | SDO | 🔴 High | 3 days | `[x]` | T3.02, T3.04 | Done. Impact-tagged cards (HIGH/MED/LOW) in results page. |
| T3.07A | **[NEW]** PDF export of feedback report: Export button → browser print with custom HTML (band score, metrics, posture bar, advice cards, transcript) | SDO | 🟡 Medium | 1 day | `[x]` | T3.04 | Done. `printReport()` in results page — opens styled HTML in new window and triggers `window.print()`. No extra dependencies. |
| T3.08 | Build Longitudinal Progress Tracking: Band Score Timeline chart | SDO | 🔴 High | 5 days | `[x]` | T2.19 | Done. `app/(student)/progress/page.tsx` — Recharts LineChart pulling from `/api/reports/history/{student_id}`. |
| T3.09 | Build per-metric sparkline trend charts (filler, eye contact, WPM, posture) | SDO | 🔴 High | 4 days | `[x]` | T3.08 | Done. 4-sparkline grid in progress page (`SparkLine` component). |
| T3.10 | Implement session comparison: side-by-side metric diff for any two sessions | SDO | 🟡 Medium | 3 days | `[x]` | T3.08 | Done. In `app/(student)/history/page.tsx` — select 2 sessions → MetricDiff panel shows arrows + colour-coded delta. |
| T3.11 | Implement Exam Mode (MUET Part 1): 2-min prep + 2-min delivery timers, prompt display | SDO | 🔴 High | 4 days | `[x]` | T2.05D | Done. `ExamPrepStep` in `PracticeContent.tsx` — 2-min countdown, auto-advance; recording capped at 120s. |
| T3.12 | Add "MUET Part 2 — Coming Soon" placeholder in Exam Mode UI | SDO | 🟢 Low | 0.5 days | `[-]` | T3.11 | Deferred — excluded per user request. |
| T3.13 | Implement session history page: list with date, topic, band, mode, duration | SDO | 🟡 Medium | 2 days | `[x]` | T2.19 | Done. `app/(student)/history/page.tsx` — real data from `/api/reports/history/{student_id}`, session list + compare mode. |

---

## Phase 4 — Educator Module, Course Management & Full API
**Duration:** Month 9–10
**Goal:** Build full Educator Module including course creation, student invite/join-request system, submission review, and class analytics.

| Task ID | Description | Obj | Priority | Effort | Status | Dependencies | Notes |
|---|---|---|---|---|---|---|---|
| T4.01 | Build Educator Dashboard: course list sidebar, class-wide aggregated analytics panel | SDO | 🔴 High | 5 days | `[x]` | T2.01B | Done. `app/(educator)/dashboard/page.tsx` — stats strip (courses, students, pending), course cards with invite code. |
| T4.01A | **[NEW]** Build Course creation form: course name, subject code, description, invite code (auto-generated); save to `courses` table | SDO | 🔴 High | 2 days | `[x]` | T4.01 | Done. `app/(educator)/courses/new/page.tsx` + `POST /api/courses`. Invite code auto-generated as `{SUBJECTCODE}-{XXXX}`. |
| T4.01B | **[NEW]** Build Student invite system: educator enters student email to send invite; creates pending record in `course_members` table; student receives email notification and joins via link | SDO | 🔴 High | 3 days | `[x]` | T4.01A | Done. In course detail Members tab — invite by email + `POST /api/courses/{id}/invite`. |
| T4.01C | **[NEW]** Build Student join-request flow: student enters invite code on `/courses` page to request joining; request appears in educator's "Pending Requests" panel; educator approves or rejects; `course_members.status` updates to `approved` or `rejected` | SDO | 🔴 High | 4 days | `[x]` | T4.01A | Done. `app/(student)/courses/page.tsx` — invite code input → `POST /api/courses/join`; educator approves/rejects in Members tab. |
| T4.02 | Implement assignment creation: title, description, rubric, deadline, exam mode toggle | SDO | 🔴 High | 4 days | `[x]` | T4.01 | Done. `app/(educator)/courses/[id]/assignments/new/page.tsx` + `POST /api/courses/{id}/assignments`. Exam mode toggle (sliding pill). |
| T4.03 | Implement PDF rubric upload: educator uploads PDF rubric per course; students can view via signed URL | SDO | 🟡 Medium | 2 days | `[x]` | T4.02 | Done. Inline rubric upload card in course detail page; `POST /api/courses/{id}/rubric`; `GET /api/courses/{id}/rubric-url` → Supabase signed URL. Student "View Rubric PDF" button on courses page. |
| T4.04 | Build submission review interface: video player + AI metrics + HITL override form | SDO | 🔴 High | 5 days | `[x]` | T2.19, T4.01 | Done. `app/(educator)/courses/[id]/submissions/[sid]/page.tsx` — video player (signed URL), AI metrics grid, transcript with filler highlights, advice cards. |
| T4.05 | Implement HITL score override: adjust band + written feedback; notify student | SDO | 🔴 High | 3 days | `[x]` | T4.04 | Done. Band selector grid (1.0–6.0 in 0.5 steps) + feedback textarea; `POST /api/submissions/{id}/override` → updates band + writes to `educator_overrides`. |
| T4.06 | Implement Supabase Storage integration: upload from FastAPI, RLS bucket policies | SDO | 🔴 High | 4 days | `[x]` | T2.06 | Done. `services/storage_service.py` — `rubrics` bucket (20MB) + `recordings` bucket (500MB); signed URL expiry 3600s. Local fallback if Storage not configured. |
| T4.07 | Implement 90-day retention policy: APScheduler weekly job, 7-day advance notification | SDO | 🟡 Medium | 2 days | `[x]` | T4.06 | Done. `run_retention_cleanup()` in `storage_service.py`; `AsyncIOScheduler` weekly job in `main.py` lifespan. |
| T4.08 | Build all FastAPI REST endpoints with auto-generated Swagger docs | SDO | 🔴 High | 7 days | `[x]` | T4.04, T4.05 | Done. All endpoints in `routers/courses.py`, `routers/submissions.py`, `routers/admin.py`. Swagger auto-generated at `/docs`. |
| T4.09 | End-to-end pipeline integration test: record → upload → Whisper → MediaPipe → Groq → report → dashboard | SDO | 🔴 High | 5 days | `[ ]` | T2.19, T3.07, T4.08 | Manual task. Test all 3 paths: unguided, guided, exam mode. |
| T4.10 | Performance profiling: verify report generation ≤90 sec on Railway free tier | SDO | 🔴 High | 2 days | `[ ]` | T4.09 | Manual task. |
| T4.11 | Confirm Railway deployment: environment variables set, health check active | SDO | 🟡 Medium | 1 day | `[ ]` | T4.08 | Manual task. Requires `pip install apscheduler` in venv + Supabase Storage buckets created. |

---

## Phase 5 — Testing, Evaluation & Remediation Sprint
**Duration:** Month 11–12

| Task ID | Description | Obj | Priority | Effort | Status | Dependencies | Notes |
|---|---|---|---|---|---|---|---|
| T5.01 | Curate manually annotated benchmark dataset: 20 videos, annotated for filler words, eye contact, WPM, posture | TEO | 🔴 High | 7 days | `[ ]` | T2.12–T2.15 | |
| T5.02 | Benchmark filler word detection accuracy (target ≥90%) | TEO | 🔴 High | 2 days | `[ ]` | T5.01, T2.12 | |
| T5.03 | Benchmark eye contact detection accuracy (target ≥90%) | TEO | 🔴 High | 2 days | `[ ]` | T5.01, T2.14 | |
| T5.04 | Benchmark posture detection accuracy (target ≥85%) | TEO | 🔴 High | 2 days | `[ ]` | T5.01, T2.15 | |
| T5.05 | Benchmark Whisper WER on Malaysian English test set (target ≤15%) | TEO | 🔴 High | 2 days | `[ ]` | T1.17, T2.11 | |
| T5.06 | Recruit pilot cohort: n=30 students + n=5 educators; ethics consent forms | TEO | 🔴 High | 5 days | `[ ]` | T4.11 | |
| T5.07 | Administer Pre-Test FLCAS anxiety survey (n=30) via Google Forms | TEO | 🔴 High | 1 day | `[ ]` | T5.06 | |
| T5.08 | Conduct 4-week supervised pilot: min 3 sessions per student (mix of unguided + guided) | TEO | 🔴 High | 20 days | `[ ]` | T5.07 | Ensure students use both session modes during pilot. |
| T5.09 | Administer Post-Test FLCAS + SUS usability survey | TEO | 🔴 High | 1 day | `[ ]` | T5.08 | |
| T5.10 | Run Paired Sample t-test on FLCAS scores; compute Cohen's d | TEO | 🔴 High | 1 day | `[ ]` | T5.09 | `scipy.stats.ttest_rel`. Target p<0.05. |
| T5.11 | Conduct semi-structured debrief interviews with n=5 educators | TEO | 🔴 High | 3 days | `[ ]` | T5.08 | |
| T5.12 | Analyse Railway server performance logs | TEO | 🟡 Medium | 2 days | `[ ]` | T5.08 | |
| T5.13 | Remediation sprint if SUS < 75: fix top UI issues; re-run SUS | SDO | 🔴 High | 7 days | `[ ]` | T5.09 | One sprint only (7 days max). |
| T5.14 | Fix critical bugs from pilot: crashes, data errors, consent/HITL failures | SDO | 🔴 High | 5 days | `[ ]` | T5.08–T5.12 | |
| T5.15 | Compile final evaluation report | TEO | 🔴 High | 5 days | `[ ]` | T5.10–T5.12 | |
| T5.16 | Prepare and submit final FYP dissertation | SDO/MIO/TEO | 🔴 High | 10 days | `[ ]` | T5.15 | |

---

## New Database Tables (Added in v4.0)

### `muet_topics`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `topic` | TEXT | e.g. "Education in Malaysia" |
| `category` | TEXT | e.g. "education", "technology", "environment" |
| `active` | BOOLEAN | False = excluded from wheel |

### `courses`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `educator_id` | UUID (FK → users.id) | |
| `name` | TEXT | e.g. "BEL 311 — Speaking Skills" |
| `subject_code` | TEXT | e.g. "BEL311" |
| `invite_code` | TEXT (UNIQUE) | Auto-generated short code |
| `created_at` | TIMESTAMPTZ | |

### `course_members`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `course_id` | UUID (FK → courses.id) | |
| `student_id` | UUID (FK → users.id) | |
| `status` | TEXT | `pending`, `approved`, `rejected` |
| `invited_by` | UUID (FK → users.id, nullable) | Null = student self-requested |
| `requested_at` | TIMESTAMPTZ | |
| `responded_at` | TIMESTAMPTZ | |

### `educator_approvals`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `educator_id` | UUID (FK → users.id) | |
| `status` | TEXT | `pending`, `approved`, `rejected` |
| `reviewed_by` | UUID (FK → users.id, nullable) | Admin who reviewed |
| `submitted_at` | TIMESTAMPTZ | |
| `reviewed_at` | TIMESTAMPTZ | |

### `presentations` — New Fields
| Field | Type | Notes |
|---|---|---|
| `session_mode` | TEXT | `unguided`, `guided`, or `exam` |
| `topic_id` | UUID (FK → muet_topics.id) | Topic selected from wheel |
| `brainstorm_notes` | TEXT | Student's 1-min prep notes (not sent to AI) |

---

## Project Summary

| Phase | Tasks | High Priority | Status |
|---|---|---|---|
| Phase 1: Requirements & Data Setup | 17 | 13 | T1.01, T1.02, T1.04, T1.06, T1.07, T1.08, T1.09, T1.12, T1.13, T1.14, T1.15 done |
| Phase 2: Core Dev & AI Pipeline | 22 | 19 | All done (22/22). T2.01C admin panel, T2.04 slide upload, T2.05E guided real-time, all complete. |
| Phase 3: NLP, Dashboard & Progress | 13 | 10 | All done (12/13). T3.12 deferred (excluded per user). |
| Phase 4: Educator Module, Courses & API | 14 | 11 | 11/14 done. T4.09, T4.10, T4.11 are manual deployment/testing tasks. |
| Phase 5: Testing & Remediation | 16 | 14 | All not started. |
| **Total** | **82** | **67** | **~56 done, T3.12 deferred, ~25 not started (manual Phase 4 tasks + Phase 5)** |

---

## Key Environment Variables

### Railway (FastAPI Backend)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-api-key
WHISPER_MODEL=tiny
ENVIRONMENT=production
```

### Vercel (Next.js Frontend)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-app.railway.app
```

---

## Free Tier Limits Reference

| Service | Free Limit | Risk | Mitigation |
|---|---|---|---|
| Supabase DB | 500 MB, 50k MAU | Low | None needed for pilot |
| Supabase Storage | 1 GB | Medium — video files | Cap recordings at 720p + 5 min max |
| Railway | 512 MB RAM, always-on | Medium — Whisper `tiny` ~390 MB | Monitor RAM; upgrade to Hobby ($5/mo) if needed |
| Groq | 30 req/min, 14,400 req/day | Low | Server-side request queue |
| Vercel | Unlimited (hobby) | None | — |
| GitHub | Unlimited | None | — |
