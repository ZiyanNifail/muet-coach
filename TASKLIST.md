# Project Tasklist
## AI-Driven Multimodal Presentation Coaching Tool

> **Version:** 5.0 — Updated to meet FYP2 Excellent/Distinction criteria across all 8 deliverable areas
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

## What Changed in v5.0 — Excellent/Distinction Gap Fixes

All gaps identified from the FYP2 Excellent/Distinction rubric are addressed below. Every new task is tagged with its source deliverable area.

| Gap | Deliverable Area | New Task(s) | Severity |
|---|---|---|---|
| DFD Level-2 diagram missing | Documentation | T1.05A | 🔴 Missing |
| Error analysis of AI predictions not documented | Documentation | T5.15A | 🔴 Missing |
| Mini research write-up (4–6 pages) not a task | Documentation | T5.15B | 🔴 Missing |
| Voice dynamics (pitch/tone/prosody) not tracked | System / AI | T2.12A | 🔴 Missing |
| Composite confidence score not explicitly surfaced | System | T3.04A | 🟡 Partial |
| PDF export was Low priority | System | T3.07A | ✅ Already done — upgraded to Medium |
| Anonymised student data in educator view | System | T4.01D | 🔴 Missing |
| **Sentiment analysis completely absent** | AI & Data | T2.12B | 🔴 Missing |
| Voice clarity / pronunciation score not tracked | AI & Data | T2.12C | 🔴 Missing |
| Baseline vs improved explicit comparison task | AI & Data | T5.08A | 🟡 Partial |
| Feedback usefulness rating not in pilot design | AI & Data | T5.08B | 🟡 Partial |
| Student self-rating vs AI rating comparison | Testing | T5.08C | 🔴 Missing |
| Latency testing under load not a proper task | Testing | T4.10A | 🟡 Partial |
| Filename anonymisation not documented | Security | T4.06A | 🟡 Partial |
| Docker containerisation not in tasklist | Deployment | T4.11A | 🔴 Missing |
| CI pipeline (lint/test on push) not a task | Deployment | T4.11B | 🟡 Partial |
| Class-wide AI insight statements not defined | Analytics | T4.01E | 🟡 Partial |
| Personalised learning paths completely absent | Analytics | T3.08A | 🔴 Missing |
| iReX preparation — 3 criteria entirely missing | iReX | T6.01, T6.02, T6.03 | 🔴 Missing |

---

## Phase 1 — Requirements, Design & Data Setup
**Duration:** Month 1–2

| Task ID | Description | Obj | Priority | Effort | Status | Dependencies | Notes |
|---|---|---|---|---|---|---|---|
| T1.01 | Review & finalise FYP proposal with supervisor | SDO | 🔴 High | 3 days | `[x]` | — | Proposal approved. |
| T1.02 | Conduct full literature review (AIEd, ASR, CV, NLP, MUET/CEFR) | SDO | 🔴 High | 10 days | `[x]` | T1.01 | 2020–2025 sources. Covers Whisper, MediaPipe, ZPD, Bandura. |
| T1.03 | Conduct semi-structured interviews with MUET/SPM educators (n=3) | MIO/TEO | 🔴 High | 5 days | `[ ]` | T1.01 | Captures tacit grading knowledge for Groq/Llama 3.3 system prompt design. |
| T1.04 | Define functional & non-functional requirements (PRD v3.0) | SDO | 🔴 High | 4 days | `[x]` | T1.02, T1.03 | Done. All advisory improvements + v3.0 stack update. |
| T1.05 | Design DB schema: all tables, fields, relationships, JSONB structures | SDO | 🔴 High | 3 days | `[ ]` | T1.04 | Includes: `muet_topics`, `courses`, `course_members`, `educator_approvals`. |
| T1.05A | **[EXCELLENT]** Draw DFD Level-2 diagram: decompose Level-1 processes into sub-processes (audio pipeline, video pipeline, scoring engine, feedback generation, storage); export as image; include in FYP report Chapter 3 | SDO | 🔴 High | 2 days | `[ ]` | T1.05 | FYP2 Documentation Excellent criterion. Level-2 DFD shows internal data flows within each major system process — more granular than the architecture diagram. |
| T1.06 | Design Use Case Diagram (Student + Educator + Admin actors) | SDO | 🔴 High | 2 days | `[x]` | T1.05 | Done. Admin actor added for educator approval flow. |
| T1.07 | Design Class Diagram | SDO | 🔴 High | 2 days | `[x]` | T1.06 | Done. |
| T1.08 | Design Sequence Diagram (feedback review flow) | SDO | 🟡 Medium | 2 days | `[x]` | T1.07 | Done. |
| T1.09 | Design Activity Diagram (full workflow including consent, topic wheel, brainstorm) | SDO | 🟡 Medium | 2 days | `[x]` | T1.08 | Done. |
| T1.10 | Create UI wireframes: all pages from DESIGN.md page map | SDO | 🔴 High | 5 days | `[ ]` | T1.04 | Pages: register, dashboard, practice, results, progress, educator dashboard, admin panel. |
| T1.11 | Set up development environment: VS Code, Python 3.11, Node.js 20, Git | SDO | 🔴 High | 1 day | `[ ]` | — | No GPU required. CPU-only stack. |
| T1.12 | Scaffold Next.js frontend project; push to GitHub; connect to Vercel | SDO | 🔴 High | 1 day | `[x]` | T1.11 | Done. Next.js 16 + Tailwind v4 + route groups `(auth)` `(student)`. |
| T1.13 | Scaffold FastAPI backend project; push to GitHub; connect to Railway | SDO | 🔴 High | 1 day | `[x]` | T1.11 | Done. FastAPI + uvicorn + all routers scaffolded. |
| T1.14 | Set up Supabase project: create all DB tables, configure RLS policies, create Storage bucket | SDO | 🔴 High | 2 days | `[x]` | T1.05, T1.12 | Done. `supabase_setup.sql` run; all tables + RLS created. |
| T1.15 | Seed `muet_topics` table with ~40 MUET-relevant topics | SDO | 🔴 High | 1 day | `[x]` | T1.14 | Done. 30 topics seeded in `supabase_setup.sql`. |
| T1.16 | Collect Malaysian English speech samples (target: 60 recordings, ~100–150 min) | MIO | 🔴 High | 10 days | `[ ]` | T1.02 | Sources: MSU volunteers, AESRC2020, Mozilla Common Voice. |
| T1.17 | Annotate speech samples with human transcriptions for WER benchmarking | MIO | 🔴 High | 7 days | `[ ]` | T1.16 | Use `jiwer`. Gate: Whisper `tiny` WER ≤15%. |

---

## Phase 2 — Core System Development: Auth, Student Module & AI Pipeline
**Duration:** Month 3–6

| Task ID | Description | Obj | Priority | Effort | Status | Dependencies | Notes |
|---|---|---|---|---|---|---|---|
| T2.01 | Implement base auth using Supabase Auth: registration, login, logout, session management | SDO | 🔴 High | 2 days | `[x]` | T1.14 | Done. `lib/auth.ts` — signUp, signIn, signOut, getAppUser. |
| T2.01A | Build role selection UI on registration page: two large cards (Student / Educator) | SDO | 🔴 High | 2 days | `[x]` | T2.01 | Done. `app/(auth)/register/page.tsx`. |
| T2.01B | Build Admin approval flow: `educator_approvals` table; pending banner on register | SDO | 🔴 High | 3 days | `[x]` | T2.01A | Done. |
| T2.01C | Build Admin panel `/admin`: approval queue with Approve / Reject; sets `users.role=educator` | SDO | 🔴 High | 3 days | `[x]` | T2.01B | Done. `app/(student)/admin/page.tsx` + `routers/admin.py`. |
| T2.02 | Build consent screen UI: checkbox + Accept button; block recording until accepted; write to `consent_log` | SDO | 🔴 High | 2 days | `[x]` | T2.01 | Done. `ConsentModal.tsx`. |
| T2.03 | Build Student Dashboard: Key Metric Cards, sidebar nav, Start Practice CTA | SDO | 🔴 High | 4 days | `[x]` | T2.01 | Done. `app/(student)/dashboard/page.tsx`. |
| T2.04 | Implement PDF slide upload: drag-and-drop, PDF-only, max 20 MB, Supabase Storage | SDO | 🔴 High | 2 days | `[x]` | T2.03 | Done. Slide upload in `PracticeContent.tsx`. |
| T2.05A | Build Practice Mode Selector: Unguided / Guided cards; saves `session_mode` | SDO | 🔴 High | 2 days | `[x]` | T2.03 | Done. In `PracticeContent.tsx`. |
| T2.05B | Build Topic Scroll Wheel modal: fetch from `muet_topics`, animate, lock, save `topic_id` | SDO | 🔴 High | 4 days | `[x]` | T2.05A, T1.15 | Done. `components/TopicWheel.tsx`. |
| T2.05C | Build Brainstorm Panel: 1-min timer, textarea, colour transitions, auto-advance, save notes | SDO | 🔴 High | 3 days | `[x]` | T2.05B | Done. `components/BrainstormPanel.tsx`. |
| T2.05D | Build Recording Interface: WebRTC, waveform, progress bar, Pause/Stop; mode-aware overlays | SDO | 🔴 High | 7 days | `[x]` | T2.05C | Done. `components/RecordingInterface.tsx`. |
| T2.05E | Build Guided Mode real-time analysis: WPM + filler detection via Web Speech API; face sampling; warning overlays | MIO | 🔴 High | 5 days | `[x]` | T2.05D, T2.14 | Done. All warnings fire as overlays in guided mode only. |
| T2.06 | Implement upload-to-backend flow: multipart POST; progress bar; 3× retry backoff | SDO | 🔴 High | 3 days | `[x]` | T2.05D | Done. XHR upload in `PracticeContent.tsx`. |
| T2.07 | Implement bandwidth check: warn if <2 Mbps (non-blocking) | SDO | 🟡 Medium | 2 days | `[x]` | T2.05D | Done. `navigator.connection.downlink` check. |
| T2.08 | Implement audio preprocessing: noise reduction, normalisation, 60-sec chunking | MIO | 🔴 High | 5 days | `[x]` | T2.06 | Done. `services/audio_service.py` — ffmpeg WAV extraction + chunking. |
| T2.09 | Implement video preprocessing: extract frames at 5 FPS, resize to 480p | MIO | 🔴 High | 3 days | `[x]` | T2.06 | Done. `services/video_service.py` — OpenCV frame extraction. |
| T2.10 | Integrate Whisper `tiny` in FastAPI: transcribe chunks, concatenate transcript | MIO | 🔴 High | 5 days | `[x]` | T2.08 | Done. `services/whisper_service.py` — lazy load, ThreadPoolExecutor. |
| T2.11 | Benchmark Whisper `tiny` WER on Malaysian English dataset; verify ≤15% | MIO | 🔴 High | 3 days | `[ ]` | T1.17, T2.10 | Manual task — deferred until dataset collected. |
| T2.12 | Implement filler word detection from transcript; compute count and density (per min) | MIO | 🔴 High | 3 days | `[x]` | T2.10 | Done. `services/nlp_service.py` — marks `[um]` in transcript. |
| T2.12A | **[EXCELLENT]** Implement voice dynamics analysis: extract pitch (Hz) and energy/loudness (dB) per audio chunk using `librosa`; compute mean pitch, pitch variance, and mean energy; store as `voice_dynamics` JSONB field in `feedback_reports`; display on results page as "Voice Dynamics" metric card | MIO | 🔴 High | 4 days | `[ ]` | T2.08 | FYP2 System Excellent: "voice dynamics" metric. `librosa.piptrack()` for pitch, `librosa.feature.rms()` for energy. Both already available since librosa is installed. |
| T2.12B | **[EXCELLENT]** Implement sentiment analysis on transcript: use `transformers` pipeline with `distilbert-base-uncased-finetuned-sst-2-english` (CPU-compatible, ~250 MB); classify each 60-sec chunk as positive/neutral/negative; compute overall sentiment score and confidence; store in `feedback_reports.sentiment` JSONB field | MIO | 🔴 High | 4 days | `[ ]` | T2.10 | FYP2 AI Excellent: "sentiment" is a required metric in the multimodal score formula. `pip install transformers torch`. Runs CPU-only. Add to multimodal score in `cefr_evaluator.py`. |
| T2.12C | **[EXCELLENT]** Implement voice clarity / pronunciation score: use Whisper's `avg_logprob` and `no_speech_prob` fields from segment-level output as proxy for clarity confidence; normalise to 0–100 score; store in `feedback_reports.clarity_score`; display on results page | MIO | 🔴 High | 3 days | `[ ]` | T2.10 | FYP2 AI Excellent: "clarity" is a required metric. Whisper already returns `avg_logprob` per segment — no new model needed. Low `avg_logprob` = unclear speech. |
| T2.13 | Implement WPM calculation per chunk; store as JSON time-series | MIO | 🔴 High | 2 days | `[x]` | T2.10 | Done. `services/nlp_service.py`. |
| T2.14 | Integrate MediaPipe Face Mesh: 468 landmarks, compute eye contact % | MIO | 🔴 High | 6 days | `[x]` | T2.09 | Done. `services/mediapipe_service.py`. |
| T2.15 | Integrate MediaPipe Pose: 33 landmarks, compute posture score (0–100) | MIO | 🔴 High | 5 days | `[x]` | T2.09 | Done. `services/mediapipe_service.py`. |
| T2.16 | Build CEFR Evaluation Layer: map all metrics → Band 1–6 | MIO | 🔴 High | 5 days | `[x]` | T2.12, T2.13, T2.14, T2.15 | Done. `services/cefr_evaluator.py`. Update after T2.12B to include sentiment in score formula. |
| T2.17 | Implement confidence scoring + fallback flags (SNR, face detection) | MIO | 🔴 High | 4 days | `[x]` | T2.14, T2.15 | Done. `{audio_ok, face_ok, pose_ok}` in `services/pipeline.py`. |
| T2.18 | Build Groq API fallback: rule-based advice strings if Groq fails | SDO | 🔴 High | 3 days | `[x]` | T2.16 | Done. `FALLBACK_ADVICE` in `services/groq_service.py`. |
| T2.19 | Build feedback report assembly: aggregate all metrics → persist to `feedback_reports` | SDO | 🔴 High | 4 days | `[x]` | T2.16, T2.17 | Done. `services/pipeline.py` → `feedback_reports` + `session_history`. Update after T2.12A, T2.12B, T2.12C to include new fields. |

---

## Phase 3 — NLP, Feedback Dashboard & Progress Tracking
**Duration:** Month 7–8

| Task ID | Description | Obj | Priority | Effort | Status | Dependencies | Notes |
|---|---|---|---|---|---|---|---|
| T3.01 | Design Groq/Llama 3.3 system prompt: embed MUET/CEFR rubric, band descriptors, output JSON schema | MIO | 🔴 High | 5 days | `[x]` | T1.03 | Done. `SYSTEM_PROMPT` in `services/groq_service.py`. |
| T3.02 | Integrate Groq API: send transcript + metrics → Llama 3.3 70B; parse JSON; 25 req/min queue | MIO | 🔴 High | 5 days | `[x]` | T3.01 | Done. `services/groq_service.py`. Falls back to rule-based on failure. |
| T3.03 | Implement spaCy NLP pipeline: type-token ratio (TTR) for lexical diversity | MIO | 🟡 Medium | 4 days | `[x]` | T2.10 | Done. `compute_lexical_diversity()` in `services/nlp_service.py`. |
| T3.04 | Build Feedback Results page: CEFR Band ring, metric cards, transcript panel with highlights | SDO | 🔴 High | 6 days | `[x]` | T2.19, T3.02 | Done. SVG band ring, WPM chart, posture bar, advice cards. |
| T3.04A | **[EXCELLENT]** Add composite Confidence Score card to results page: compute as weighted average of eye_contact_pct (30%) + posture_score (20%) + clarity_score (25%) + (100 - filler_density_normalised) (25%); display as a single 0–100 score with label "Delivery Confidence"; add to `feedback_reports` as `confidence_score` field | SDO | 🟡 Medium | 2 days | `[ ]` | T2.12C, T3.04 | FYP2 System Excellent: "confidence score" metric. Formula uses already-computed fields. Computed in `cefr_evaluator.py` after all metrics are assembled. |
| T3.05 | Implement WPM pace line chart (Recharts LineChart) with 130/150 WPM reference lines | SDO | 🔴 High | 2 days | `[x]` | T2.13, T3.04 | Done. |
| T3.06 | Display posture score: badge (Good/Needs Work/Poor) + progress bar + explanation | SDO | 🔴 High | 2 days | `[x]` | T2.15, T3.04 | Done. `PostureBar` component. |
| T3.07 | Implement Actionable Advice Cards (max 5 from Groq; fallback to rule-based) | SDO | 🔴 High | 3 days | `[x]` | T3.02, T3.04 | Done. Impact-tagged cards in results page. |
| T3.07A | PDF export of feedback report: Export button → styled HTML print | SDO | 🟡 Medium | 1 day | `[x]` | T3.04 | Done. `printReport()` in results page. FYP2 System Excellent criterion. |
| T3.08 | Build Longitudinal Progress Tracking: Band Score Timeline chart | SDO | 🔴 High | 5 days | `[x]` | T2.19 | Done. `app/(student)/progress/page.tsx`. |
| T3.08A | **[EXCELLENT]** Build Personalised Learning Path panel on Progress page: after 2+ sessions, Groq analyses the student's metric trend data and returns a prioritised 3-step practice recommendation (e.g. "Focus on eye contact this week", "Next: reduce filler words", "Then: work on pacing"); display as a numbered step card panel below the progress charts | SDO | 🔴 High | 4 days | `[ ]` | T3.08, T3.02 | FYP2 Analytics Excellent: "personalised learning paths". Groq prompt receives last 3 sessions' metrics and returns JSON `{steps: [{priority, focus_area, advice}]}`. Cached in `session_history` — regenerated only when new session added. |
| T3.09 | Build per-metric sparkline trend charts (filler, eye contact, WPM, posture) | SDO | 🔴 High | 4 days | `[x]` | T3.08 | Done. 4-sparkline grid in progress page. |
| T3.10 | Implement session comparison: side-by-side metric diff for any two sessions | SDO | 🟡 Medium | 3 days | `[x]` | T3.08 | Done. `app/(student)/history/page.tsx` — MetricDiff panel. |
| T3.11 | Implement Exam Mode (MUET Part 1): 2-min prep + 2-min delivery timers | SDO | 🔴 High | 4 days | `[x]` | T2.05D | Done. `ExamPrepStep` in `PracticeContent.tsx`. |
| T3.12 | Add "MUET Part 2 — Coming Soon" placeholder in Exam Mode UI | SDO | 🟢 Low | 0.5 days | `[-]` | T3.11 | Deferred — excluded per user request. |
| T3.13 | Implement session history page: list with date, topic, band, mode, duration | SDO | 🟡 Medium | 2 days | `[x]` | T2.19 | Done. `app/(student)/history/page.tsx`. |

---

## Phase 4 — Educator Module, Course Management & Full API
**Duration:** Month 9–10

| Task ID | Description | Obj | Priority | Effort | Status | Dependencies | Notes |
|---|---|---|---|---|---|---|---|
| T4.01 | Build Educator Dashboard: course list sidebar, class-wide aggregated analytics panel | SDO | 🔴 High | 5 days | `[x]` | T2.01B | Done. `app/(educator)/dashboard/page.tsx`. |
| T4.01A | Build Course creation form: name, subject code, description, auto-generated invite code | SDO | 🔴 High | 2 days | `[x]` | T4.01 | Done. `app/(educator)/courses/new/page.tsx`. |
| T4.01B | Build Student invite system: invite by email → pending `course_members` record | SDO | 🔴 High | 3 days | `[x]` | T4.01A | Done. Members tab + `POST /api/courses/{id}/invite`. |
| T4.01C | Build Student join-request flow: invite code → pending request → educator approves/rejects | SDO | 🔴 High | 4 days | `[x]` | T4.01A | Done. `app/(student)/courses/page.tsx` + educator Members tab. |
| T4.01D | **[EXCELLENT]** Anonymise student data in Educator class analytics view: replace student names with "Student A", "Student B" (etc.) in all aggregate analytics panels and charts; raw names only visible in the individual submission review page (T4.04) where the educator has explicit assignment context | SDO | 🔴 High | 2 days | `[ ]` | T4.01 | FYP2 System Excellent: "instructor-view dashboard with anonymised student improvement data". Apply in `GET /api/analytics/class/{course_id}` — return `student_alias` instead of `full_name` in aggregate queries. Store alias mapping server-side per course. |
| T4.01E | **[EXCELLENT]** Add AI Insight Patterns panel to Educator Dashboard: after each session batch, Groq analyses class-wide metrics and generates 3 natural-language insight statements (e.g. "Most students in BEL311 struggle with filler words — 18/22 exceeded 5/min", "Eye contact has improved 12% across the class over the last 2 weeks"); display as a "Class Insights" card below the analytics strip; refresh weekly | SDO | 🟡 Medium | 4 days | `[ ]` | T4.01, T3.02 | FYP2 Analytics Excellent: "AI insight patterns". Groq prompt receives aggregated class metrics JSON; returns `{insights: [string]}`. Cache in `courses` table as `ai_insights` JSONB + `insights_generated_at`. Regenerate if >7 days old or educator manually refreshes. |
| T4.02 | Implement assignment creation: title, description, rubric, deadline, exam mode toggle | SDO | 🔴 High | 4 days | `[x]` | T4.01 | Done. `app/(educator)/courses/[id]/assignments/new/page.tsx`. |
| T4.03 | Implement PDF rubric upload; student view via signed URL | SDO | 🟡 Medium | 2 days | `[x]` | T4.02 | Done. Inline rubric upload card; signed URL for students. |
| T4.04 | Build submission review interface: video player + AI metrics + HITL override form | SDO | 🔴 High | 5 days | `[x]` | T2.19, T4.01 | Done. `app/(educator)/courses/[id]/submissions/[sid]/page.tsx`. |
| T4.05 | Implement HITL score override: adjust band + written feedback; notify student | SDO | 🔴 High | 3 days | `[x]` | T4.04 | Done. Band selector + feedback textarea; `POST /api/submissions/{id}/override`. |
| T4.06 | Implement Supabase Storage integration: upload from FastAPI, RLS bucket policies | SDO | 🔴 High | 4 days | `[x]` | T2.06 | Done. `services/storage_service.py` — `rubrics` + `recordings` buckets; signed URLs. |
| T4.06A | **[EXCELLENT]** Document and enforce filename anonymisation: ensure all files stored in Supabase Storage use UUID-based paths only (no student names or readable identifiers in paths); add a comment block in `storage_service.py` explicitly labelling this as an anonymisation procedure; add a "Data Anonymisation" subsection to FYP report Chapter 5 (Security) | SDO | 🟡 Medium | 1 day | `[ ]` | T4.06 | FYP2 Security Excellent: "simple anonymisation procedures (filename randomisation)". Storage paths already use `{user_id}/{session_id}` (UUIDs) — this task is documentation + a code comment confirming intent. |
| T4.07 | Implement 90-day retention policy: APScheduler weekly job, 7-day advance notification | SDO | 🟡 Medium | 2 days | `[x]` | T4.06 | Done. `run_retention_cleanup()` + `AsyncIOScheduler` in `main.py`. |
| T4.08 | Build all FastAPI REST endpoints with auto-generated Swagger docs at `/docs` | SDO | 🔴 High | 7 days | `[x]` | T4.04, T4.05 | Done. All endpoints in `routers/courses.py`, `routers/submissions.py`, `routers/admin.py`. |
| T4.09 | End-to-end pipeline integration test: record → upload → Whisper → MediaPipe → Groq → report → dashboard | SDO | 🔴 High | 5 days | `[ ]` | T2.19, T3.07, T4.08 | Manual task. Test all 3 paths: unguided, guided, exam mode. |
| T4.10 | Performance profiling: verify report generation ≤90 sec on Railway free tier | SDO | 🔴 High | 2 days | `[ ]` | T4.09 | Manual task. |
| T4.10A | **[EXCELLENT]** Latency testing under moderate load: simulate 3–5 concurrent users uploading simultaneously using `locust` (free Python load testing tool); measure: (1) audio processing time per session, (2) Whisper transcription time per chunk, (3) total report generation time, (4) API response time under load; document results in FYP report as a "System Performance" table | TEO | 🟡 Medium | 3 days | `[ ]` | T4.10 | FYP2 Testing Excellent: "latency testing — system response under moderate load". `pip install locust`. Run locally against Railway endpoint. Results go in FYP Chapter 4 Testing section. |
| T4.11 | Confirm Railway deployment: environment variables set, health check active | SDO | 🟡 Medium | 1 day | `[ ]` | T4.08 | Manual task. |
| T4.11A | **[EXCELLENT]** Containerise backend with Docker: write `Dockerfile` for FastAPI backend; write `docker-compose.yml` (backend + optional local Supabase); add `README.md` section on Docker deployment; push image build to GitHub Actions on push to `main` | SDO | 🔴 High | 3 days | `[ ]` | T4.11 | FYP2 Deployment Excellent: "Docker container for easier deployment". `Dockerfile` uses `python:3.11-slim`; installs requirements; copies backend; runs `uvicorn main:app`. This also enables the CI pipeline in T4.11B. |
| T4.11B | **[EXCELLENT]** Set up basic CI pipeline via GitHub Actions: on every push to `main` — (1) lint Python backend with `flake8`, (2) lint Next.js frontend with `eslint`, (3) build Docker image (from T4.11A) to confirm it builds without errors; add `.github/workflows/ci.yml` | SDO | 🟡 Medium | 2 days | `[ ]` | T4.11A | FYP2 Deployment Excellent: "basic CI (auto-lint or auto-deploy)". GitHub Actions is free for public and private repos. Lint failures block merge to main. |

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
| T5.08 | Conduct 4-week supervised pilot: min 3 sessions per student (mix of unguided + guided) | TEO | 🔴 High | 20 days | `[ ]` | T5.07 | Ensure students complete both session modes — baseline (unguided) first, then guided. |
| T5.08A | **[EXCELLENT]** Before-vs-after improvement analysis: at end of pilot, compare each student's first unguided session metrics vs their last guided session metrics; compute per-metric delta (WPM, eye contact, filler count, posture, band score); present as a table in FYP report showing mean improvement across cohort | TEO | 🔴 High | 3 days | `[ ]` | T5.08 | FYP2 AI Excellent: "comparison — baseline scoring vs improved scoring". This is why unguided (baseline) and guided (coached) session modes exist as separate `session_mode` values. Data is already in `feedback_reports` — this is a query + write-up task. |
| T5.08B | **[EXCELLENT]** Administer feedback usefulness rating survey: after each session, prompt students with a 5-question in-app micro-survey rating the AI advice cards (1–5 scale): relevance, clarity, actionability, fairness, overall satisfaction; store responses in a new `feedback_ratings` table; compute mean usefulness score per student and across cohort | TEO | 🟡 Medium | 3 days | `[ ]` | T5.08, T3.07 | FYP2 AI Excellent: "small user study rating feedback usefulness". In-app micro-survey shown 30 seconds after results page loads. New table: `feedback_ratings {id, report_id, student_id, relevance, clarity, actionability, fairness, overall, created_at}`. |
| T5.08C | **[EXCELLENT]** Student self-rating vs AI rating comparison: at end of each session (before seeing AI results), ask student to rate their own performance across 4 metrics (eye contact, pacing, filler words, overall band) on a 1–6 scale; store in `self_ratings` table; after pilot, compute correlation between student self-ratings and AI scores using Pearson's r; include in FYP report | TEO | 🔴 High | 4 days | `[ ]` | T5.08 | FYP2 Testing Excellent: "comparative analysis — student self-rating vs AI rating". Self-rating screen shown between Stop Recording and Upload steps. New table: `self_ratings {id, presentation_id, student_id, eye_contact, pacing, filler_words, overall_band, created_at}`. |
| T5.09 | Administer Post-Test FLCAS + SUS usability survey | TEO | 🔴 High | 1 day | `[ ]` | T5.08 | |
| T5.10 | Run Paired Sample t-test on FLCAS scores; compute Cohen's d | TEO | 🔴 High | 1 day | `[ ]` | T5.09 | `scipy.stats.ttest_rel`. Target p<0.05. |
| T5.11 | Conduct semi-structured debrief interviews with n=5 educators | TEO | 🔴 High | 3 days | `[ ]` | T5.08 | |
| T5.12 | Analyse Railway server performance logs | TEO | 🟡 Medium | 2 days | `[ ]` | T5.08 | |
| T5.13 | Remediation sprint if SUS < 75: fix top UI issues; re-run SUS | SDO | 🔴 High | 7 days | `[ ]` | T5.09 | One sprint only (7 days max). |
| T5.14 | Fix critical bugs from pilot: crashes, data errors, consent/HITL failures | SDO | 🔴 High | 5 days | `[ ]` | T5.08–T5.12 | |
| T5.15 | Compile final evaluation report: WER, accuracy, SUS, FLCAS t-test, Cohen's d, educator interviews | TEO | 🔴 High | 5 days | `[ ]` | T5.10–T5.12 | |
| T5.15A | **[EXCELLENT]** Write AI error analysis section for FYP report (Chapter 4): for each AI component (Whisper, MediaPipe Face, MediaPipe Pose, sentiment model), document: (1) types of errors observed during testing, (2) example failure cases with screenshots or transcripts, (3) root cause analysis, (4) mitigation steps taken or recommended; minimum 1 page per component | TEO | 🔴 High | 5 days | `[ ]` | T5.01–T5.05, T5.08 | FYP2 Documentation Excellent: "error analysis of AI predictions". Based on benchmark results (T5.01–T5.05) and pilot observations. This is a documentation task, not a code task. |
| T5.15B | **[EXCELLENT]** Write mini research write-up (4–6 pages) as a standalone section in FYP report: structured as: (1) Research Background — gap in Malaysian MUET coaching tools, (2) Approach — multimodal AI pipeline design decisions, (3) Results — quantitative outcomes (WER, accuracy, SUS, FLCAS, self-rating correlation), (4) Limitations — known gaps, model biases, scope constraints; write in academic style with citations | TEO | 🔴 High | 4 days | `[ ]` | T5.15, T5.15A | FYP2 Documentation Excellent: "mini research write-up (4–6 pages)". This distinguishes a Distinction submission from a Pass submission. Should be positioned as a "Research Summary" chapter or appendix in the final FYP report. |
| T5.16 | Prepare and submit final FYP dissertation | SDO/MIO/TEO | 🔴 High | 10 days | `[ ]` | T5.15B | |

---

## Phase 6 — iReX Exhibition Preparation *(New Phase — Excellent Criterion)*
**Duration:** 2 weeks before exhibition
**Goal:** Prepare a professional, Distinction-level iReX exhibition showcasing the system with a live demo, AI pipeline explanation, and SDG 4 handout. All 3 items are required for the Excellent grade.

| Task ID | Description | Obj | Priority | Effort | Status | Dependencies | Notes |
|---|---|---|---|---|---|---|---|
| T6.01 | **[EXCELLENT]** Prepare real-time scoring demo for iReX: set up a dedicated demo account with pre-loaded sample sessions; ensure the full pipeline (record → analyse → results) can be demonstrated live within 3–5 minutes; prepare a backup demo video in case of network failure; test the demo flow at least 3 times before the exhibition | SDO | 🔴 High | 3 days | `[ ]` | T4.09, T4.11 | FYP2 iReX Excellent: "real-time scoring demo". The live demo is the centrepiece — visitors record a 30-second clip and see their AI feedback appear in real time. Prepare a short topic ("Describe your morning routine") that works well for a 30-second demo. |
| T6.02 | **[EXCELLENT]** Prepare workshop-style AI pipeline explanation for iReX: create a single A2 or A1 printed diagram showing the full pipeline (WebRTC → FastAPI → Whisper → MediaPipe → Groq → Supabase → Dashboard) with plain-language annotations at each stage; practise a 2-minute verbal walkthrough of the diagram suitable for non-technical visitors | SDO | 🔴 High | 2 days | `[ ]` | T4.08 | FYP2 iReX Excellent: "workshop-style explanation of AI pipeline". The printed diagram + verbal explanation shows depth of understanding. Use the architecture diagram from PRD.md Section 6.4 as the base — redraw it in presentation quality. |
| T6.03 | **[EXCELLENT]** Design and print SDG 4 contribution handout for iReX: single A5 double-sided card explaining how the system contributes to UN SDG 4 (Quality Education): (1) front — project name, tagline, QR code to live demo; (2) back — "How we support SDG 4" with 3 bullet points (access to coaching, MUET/CEFR alignment, reducing anxiety), pilot study results summary (SUS score, anxiety reduction %), and supervisor/institution details | SDO | 🔴 High | 2 days | `[ ]` | T5.15 | FYP2 iReX Excellent: "handout summarising SDG 4 contribution". Print minimum 30 copies. QR code links to Vercel deployment. Include actual pilot results once available. |

---

## New Database Tables (Added in v5.0)

### `feedback_ratings` *(new — T5.08B)*
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `report_id` | UUID (FK → feedback_reports.id) | |
| `student_id` | UUID (FK → users.id) | |
| `relevance` | INTEGER | 1–5 rating |
| `clarity` | INTEGER | 1–5 rating |
| `actionability` | INTEGER | 1–5 rating |
| `fairness` | INTEGER | 1–5 rating |
| `overall` | INTEGER | 1–5 rating |
| `created_at` | TIMESTAMPTZ | |

### `self_ratings` *(new — T5.08C)*
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `presentation_id` | UUID (FK → presentations.id) | |
| `student_id` | UUID (FK → users.id) | |
| `eye_contact` | INTEGER | 1–6 self-rating |
| `pacing` | INTEGER | 1–6 self-rating |
| `filler_words` | INTEGER | 1–6 self-rating |
| `overall_band` | FLOAT | 1.0–6.0 self-rating |
| `created_at` | TIMESTAMPTZ | |

### `feedback_reports` — New Fields *(v5.0)*
| Field | Type | Notes |
|---|---|---|
| `voice_dynamics` | JSONB | `{mean_pitch_hz, pitch_variance, mean_energy_db}` — from T2.12A |
| `sentiment` | JSONB | `{overall, chunks: [{chunk_id, label, score}]}` — from T2.12B |
| `clarity_score` | FLOAT | 0–100, from Whisper `avg_logprob` — from T2.12C |
| `confidence_score` | FLOAT | 0–100, composite delivery score — from T3.04A |

### `courses` — New Fields *(v5.0)*
| Field | Type | Notes |
|---|---|---|
| `ai_insights` | JSONB | `[string]` — class-wide Groq insight statements — from T4.01E |
| `insights_generated_at` | TIMESTAMPTZ | Used to determine if regeneration is needed |

---

## Project Summary

| Phase | Tasks | High Priority | Status |
|---|---|---|---|
| Phase 1: Requirements & Data Setup | 18 | 14 | 11 done, T1.05A new |
| Phase 2: Core Dev & AI Pipeline | 25 | 22 | 22 done, T2.12A/B/C new |
| Phase 3: NLP, Dashboard & Progress | 15 | 11 | 12 done, T3.04A/T3.08A new |
| Phase 4: Educator Module, Courses & API | 19 | 14 | 11 done, T4.01D/E/T4.06A/T4.10A/T4.11A/B new |
| Phase 5: Testing & Remediation | 19 | 17 | 0 done, T5.08A/B/C/T5.15A/B new |
| Phase 6: iReX Exhibition | 3 | 3 | 0 done, entirely new phase |
| **Total** | **99** | **81** | **~56 done, 43 not started** |

---

## Excellent/Distinction Checklist

Track these specifically — they are the difference between a Pass and a Distinction.

| # | Deliverable Area | Task | Status |
|---|---|---|---|
| E1 | Documentation | DFD Level-2 diagram (T1.05A) | `[ ]` |
| E2 | Documentation | Error analysis of AI predictions (T5.15A) | `[ ]` |
| E3 | Documentation | Mini research write-up 4–6 pages (T5.15B) | `[ ]` |
| E4 | System | Voice dynamics metric on results page (T2.12A) | `[ ]` |
| E5 | System | Composite confidence score (T3.04A) | `[ ]` |
| E6 | System | PDF export of feedback report (T3.07A) | `[x]` Done |
| E7 | System | Anonymised student data in educator view (T4.01D) | `[ ]` |
| E8 | AI & Data | Sentiment analysis in multimodal score (T2.12B) | `[ ]` |
| E9 | AI & Data | Voice clarity score from Whisper (T2.12C) | `[ ]` |
| E10 | AI & Data | Baseline vs improved comparison analysis (T5.08A) | `[ ]` |
| E11 | AI & Data | Feedback usefulness rating survey (T5.08B) | `[ ]` |
| E12 | Testing | Student self-rating vs AI rating (T5.08C) | `[ ]` |
| E13 | Testing | Latency testing under moderate load (T4.10A) | `[ ]` |
| E14 | Security | Filename anonymisation documented (T4.06A) | `[ ]` |
| E15 | Deployment | Docker containerisation (T4.11A) | `[ ]` |
| E16 | Deployment | GitHub Actions CI pipeline (T4.11B) | `[ ]` |
| E17 | Analytics | Class-wide AI insight patterns (T4.01E) | `[ ]` |
| E18 | Analytics | Personalised learning paths (T3.08A) | `[ ]` |
| E19 | iReX | Real-time scoring demo (T6.01) | `[ ]` |
| E20 | iReX | Workshop-style AI pipeline diagram (T6.02) | `[ ]` |
| E21 | iReX | SDG 4 contribution handout (T6.03) | `[ ]` |

**Progress: 1/21 Excellent criteria complete.**

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
| Railway | 512 MB RAM, always-on | Medium — Whisper `tiny` ~390 MB + sentiment model ~250 MB | Monitor RAM carefully after T2.12B; upgrade to Hobby ($5/mo) if needed |
| Groq | 30 req/min, 14,400 req/day | Low | Server-side request queue |
| Vercel | Unlimited (hobby) | None | — |
| GitHub | Unlimited | None | — |
| GitHub Actions | 2,000 min/month free | None for small CI | Lint + Docker build stays under limit |
