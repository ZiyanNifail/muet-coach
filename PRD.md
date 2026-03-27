# Product Requirements Document
## AI-Driven Multimodal Presentation Coaching Tool
### For MUET / SPM and University Students

> **Version:** 3.0 — Final (Revised for Development)
> **Author:** Ziyan Nifail (012024091602)
> **Institution:** Management and Science University (MSU)
> **Programme:** Bachelor in Computer Science (Honours)
> **Supervisor:** Assoc. Prof. Ts. Dr Muhammad Irsyad Abdullah
> **Date:** March 2025
> **Status:** Active — Ready for Development

---

## 0. Change Log

| Version | Change |
|---------|--------|
| v1.0 | Initial PRD |
| v2.0 | 15 advisory improvements applied (ASR consistency, pilot scale, error handling, posture, DB schema, storage, etc.) |
| v3.0 | Technology stack updated for real deployment: Next.js frontend, FastAPI backend, Supabase (DB + Storage), Railway (backend hosting), Vercel (frontend hosting), Groq + Llama 3.3 70B (LLM). Google Drive replaced by Supabase Storage. Gemini replaced by Groq. Author name corrected to Ziyan Nifail. |

---

## 1. Executive Summary

This document defines the product requirements for an **AI-Driven Multimodal Presentation Coaching Tool** — a full-stack web application that provides automated, real-time feedback on oral presentation delivery.

The system targets two primary user groups:
- **Tertiary students** at Management and Science University (MSU)
- **Candidates** preparing for MUET (Malaysian University English Test) and SPM Speaking paper

The platform fuses Computer Vision (gaze and posture tracking via MediaPipe), Automatic Speech Recognition (OpenAI Whisper, open-source), and Natural Language Processing (Groq API running Llama 3.3 70B) within a single web application to deliver rubric-aligned, CEFR-calibrated coaching at **zero software licensing cost**.

---

## 2. Problem Statement

### 2.1 Core Problems

- **Scalability:** Student-to-educator ratios of 1:30–1:40 make individualised speaking practice impossible in classroom settings.
- **Subjectivity:** Human grading of presentations is inconsistent across evaluators and sessions.
- **Contextual Mismatch:** Existing commercial AI tools (Yoodli, Microsoft Presenter Coach) are optimised for corporate settings, carry Western accent bias, and have no alignment with MUET/SPM rubrics.

### 2.2 Stakeholder Pain Points

| Stakeholder | Pain Point | Impact |
|---|---|---|
| Students | No on-demand practice; fear of negative judgment in live settings | Low confidence, poor exam outcomes |
| MUET/SPM Candidates | Cannot practice exam-specific rubrics (turn-taking, fluency bands) at home | Under-prepared for Band 5/6 requirements |
| Educators | Time-consuming manual grading; no data to track progress over time | Grading fatigue; inconsistent standards |
| MSU Institution | No standardised digital mechanism to assess soft skills across faculties | Unverifiable graduate employability claims |

---

## 3. Project Objectives

| ID | Type | Goal | Target Metric | Status |
|---|---|---|---|---|
| SDO-01 | System Development | Design and deliver a dual-purpose web-based presentation analysis prototype | Functional prototype within 12 months | Active |
| MIO-01 | Model Implementation | Deploy multimodal AI pipeline (Computer Vision + ASR + NLP) using fully free/open-source stack | ≥90% accuracy on filler word and eye contact detection; WER ≤15% | Active |
| TEO-01 | Testing & Evaluation | Validate usability and anxiety-reduction via pilot study | SUS ≥75; n=30 students, n=5 educators; p<0.05 on FLCAS | Active |

---

## 4. Target Users

### Persona 1 — University Student
- **Profile:** MSU undergraduate; native Malaysian English speaker; moderate digital literacy
- **Goal:** Practice presentation delivery before graded coursework assessments
- **Key Need:** Private, judgment-free practice with immediate actionable feedback and longitudinal progress tracking

### Persona 2 — MUET / SPM Candidate
- **Profile:** Pre-university or Form 5 student preparing for MUET Band 4–6
- **Goal:** Master CEFR-aligned rubrics (fluency, turn-taking, lexical resource) under timed exam conditions
- **Key Need:** Exam Mode with timed prompts, MUET-specific rubric feedback, and clear band score mapping

### Persona 3 — Educator / MUET Examiner
- **Profile:** University lecturer or secondary school English teacher; certified MUET examiner
- **Goal:** Assign tasks, review AI reports, override scores, and track class-wide analytics
- **Key Need:** Educator Dashboard with assignment management, HITL override, and aggregated class analytics

---

## 5. Scope

### 5.1 In Scope (v1.0 Prototype)

- **Student Module:** Secure login, PDF slide upload, in-browser video/audio recording via WebRTC
- **AI Analysis Pipeline:** Visual analysis (eye contact, posture), acoustic analysis (WPM, filler words, pauses), NLP evaluation (vocabulary, fluency) against CEFR standards
- **Feedback Dashboard:** Post-session analytics with band score ring, pace chart, transcript highlighting, advice cards, and longitudinal progress tracking
- **Exam Mode:** Timed sessions for MUET Part 1 (Individual Presentation — 2 min prep, 2 min delivery). MUET Part 2 deferred to v2.0
- **Educator Module:** Assignment creation, rubric management, submission review, HITL override, class-wide analytics
- **Consent Flow:** Explicit in-app consent screen before first recording
- **Modular API Architecture:** Designed for future LMS integration (Eklas/Moodle)
- **Single-speaker mode only**

### 5.2 Out of Scope (Deferred to v2.0)

- **MUET Part 2:** Multi-speaker group discussion simulation — requires speaker diarisation and multi-feed video, beyond 12-month FYP scope
- Full PDPA compliance — prototype operates under controlled research consent framework
- Assessment of content quality, argument persuasiveness, or slide design
- Mobile native applications (iOS/Android) — web-responsive only
- Bahasa Malaysia or non-English speech analysis

---

## 6. Technology Stack

> **Principle:** Zero licensing cost. Every tool below is free for the usage scale of this project.

### 6.1 Full Stack Overview

| Layer | Technology | Free Tier | Why Chosen |
|---|---|---|---|
| **Frontend Framework** | Next.js (React) | Free | Made by Vercel team — zero-config deployment on Vercel; built-in routing; beginner-friendly |
| **Frontend Hosting** | Vercel | Free (unlimited hobby) | One `git push` deploys the Next.js frontend; global CDN |
| **Backend Framework** | Python + FastAPI | Free | Async, fast, auto-generates OpenAPI docs; ideal for AI pipeline endpoints |
| **Backend Hosting** | Railway | Free tier (512 MB RAM, always-on) | Supports long-running Python processes; no timeout unlike Vercel serverless; deploys from GitHub |
| **Database** | Supabase (PostgreSQL) | Free (500 MB DB, 50k MAU) | Managed PostgreSQL + built-in Auth + real-time; replaces need to build JWT/bcrypt from scratch |
| **File Storage** | Supabase Storage | Free (1 GB) | Replaces Google Drive API — far simpler; designed for app file uploads; 1 GB covers 30-user pilot |
| **ASR (Speech-to-Text)** | OpenAI Whisper (self-hosted, `tiny` model) | Free (open-source) | Sole ASR engine; CPU-only; `tiny` model ~390 MB RAM (fits Railway free tier); handles Malaysian English well |
| **LLM (Feedback Generation)** | Groq API + Llama 3.3 70B | Free (14,400 req/day, 30 req/min) | Replaces Gemini Flash; Llama 3.3 is open-weight; Groq hosts it on LPU hardware — near-instant inference; OpenAI-compatible API |
| **Computer Vision — Face** | MediaPipe Face Mesh (Python) | Free (open-source) | 468-point face landmark mesh; computes eye contact % via Euler angles; CPU-only |
| **Computer Vision — Pose** | MediaPipe Pose (Python) | Free (open-source) | 33-point body landmarks; computes posture score from head tilt + shoulder symmetry; CPU-only |
| **NLP Preprocessing** | spaCy (Python) | Free (open-source) | Tokenisation, POS tagging, lexical diversity (type-token ratio) for CEFR vocabulary scoring |
| **Audio Processing** | librosa (Python) | Free (open-source) | Noise reduction, normalisation, 60-second audio chunking for Whisper |
| **WER Benchmarking** | jiwer (Python) | Free (open-source) | Measures Word Error Rate of Whisper against human-annotated Malaysian English test set |
| **Version Control** | GitHub | Free | Source of truth; triggers auto-deploy on Vercel (frontend) and Railway (backend) |
| **Survey Tool** | Google Forms | Free | Distributes FLCAS + SUS surveys to pilot cohort |

### 6.2 Why Vercel Cannot Host the Backend

Vercel serverless functions have a **10-second timeout** on the free tier. Whisper transcription of a 5-minute recording takes 60–90 seconds on CPU. MediaPipe processes hundreds of video frames. These jobs will consistently time out on Vercel.

**Solution:** Frontend on Vercel, backend on Railway. The Next.js app calls the FastAPI backend via environment variable `NEXT_PUBLIC_API_URL=https://your-app.railway.app`.

### 6.3 Whisper Model Selection

| Model | RAM Required | WER (general) | Recommendation |
|---|---|---|---|
| `tiny` | ~390 MB | ~10–12% on clean speech | **Start here** — fits Railway free tier |
| `base` | ~1 GB | ~7–9% | Upgrade if `tiny` WER > 15% on Malaysian English test |
| `small` | ~2 GB | ~6–8% | Requires Railway Hobby plan ($5/month) |

Start with `tiny`. Run WER benchmarking (Task T2.11). Only upgrade if the target of ≤15% WER is not met.

### 6.4 Architecture Diagram (Text)

```
[User Browser]
     │
     ▼
[Next.js — Vercel]          ← Frontend (UI, WebRTC recording)
     │  REST API calls
     ▼
[FastAPI — Railway]         ← Backend (AI pipeline, business logic)
     │
     ├──► [Whisper tiny]    ← ASR: audio → transcript
     ├──► [MediaPipe Face]  ← Eye contact %
     ├──► [MediaPipe Pose]  ← Posture score
     ├──► [spaCy]           ← Lexical diversity score
     └──► [Groq API]        ← Llama 3.3 70B → advice cards
     │
     ▼
[Supabase]
     ├── PostgreSQL DB      ← Users, sessions, reports, assignments
     └── Supabase Storage   ← Video/audio files
```

---

## 7. Functional Requirements

### 7.1 Authentication & User Management

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | Supabase Auth handles registration, login, and session management (email + password). Role stored in `users` table (student / educator) | High |
| FR-AUTH-02 | Separate dashboards and permission sets per role | High |
| FR-AUTH-03 | Password reset via Supabase's built-in email flow | Medium |

### 7.2 Consent & Privacy

| ID | Requirement | Priority |
|---|---|---|
| FR-CONSENT-01 | Before first recording, display an explicit consent screen explaining that video and audio will be processed by AI and stored on Supabase | High |
| FR-CONSENT-02 | Student must actively accept consent (checkbox + button) before any recording feature is unlocked | High |
| FR-CONSENT-03 | Consent record (timestamp, user ID) stored in `consent_log` table | High |
| FR-CONSENT-04 | Students can withdraw consent and request data deletion from Settings page | Medium |

### 7.3 Student Module

| ID | Requirement | Priority |
|---|---|---|
| FR-STU-01 | Upload PDF slides (drag-and-drop + button); validated client-side (PDF only, max 20 MB) | High |
| FR-STU-02 | In-browser video/audio recording via WebRTC (Start / Pause / Stop) | High |
| FR-STU-03 | Real-time audio waveform indicator during recording confirms microphone is active | High |
| FR-STU-04 | View historical sessions and feedback reports | Medium |
| FR-STU-05 | Exam Mode: MUET Part 1 prompts with 2-min prep timer + 2-min recording timer | High |
| FR-STU-06 | Dashboard Key Metric Cards: Current Band Score, Practice Hours, Total Sessions | Medium |

### 7.4 AI Analysis Pipeline

| ID | Requirement | Priority |
|---|---|---|
| FR-AI-01 | MediaPipe Face Mesh computes eye contact % (% of session time gaze is within ±15° of camera) | High |
| FR-AI-02 | MediaPipe Pose computes posture score (0–100) from head tilt angle + shoulder symmetry | High |
| FR-AI-03 | Whisper `tiny` model transcribes speech; audio chunked into 60-sec segments before processing | High |
| FR-AI-04 | Whisper WER verified ≤15% on Malaysian English test set before production deployment | High |
| FR-AI-05 | Filler word detection: `um`, `uh`, `ah`, `like`, `you know` — count and density (per min) computed from transcript | High |
| FR-AI-06 | WPM calculated per 60-sec segment; stored as JSON time-series array | High |
| FR-AI-07 | spaCy computes type-token ratio (lexical diversity score) from transcript | Medium |
| FR-AI-08 | Groq API (Llama 3.3 70B) evaluates transcript + all metrics against CEFR/MUET rubric via system prompt (in-context learning); returns band prediction + 5 advice cards | High |
| FR-AI-09 | CEFR Evaluation Layer maps metrics to Band 1–6. Band 5 baseline: 130–150 WPM, eye contact ≥60%, filler <5/min, posture ≥70 | High |
| FR-AI-10 | Confidence scoring: poor SNR → audio metrics flagged N/A; face not detected → visual metrics flagged N/A | Medium |
| FR-AI-11 | Full analysis report generated within 90 seconds of upload for recordings ≤5 minutes | Medium |

### 7.5 Error Handling & Fallback Behaviour

| ID | Failure Scenario | Fallback Behaviour |
|---|---|---|
| FR-ERR-01 | MediaPipe Face Mesh fails (poor lighting / camera blocked) | Eye contact flagged N/A; banner shown: "Face not detected — ensure adequate lighting"; posture proceeds independently |
| FR-ERR-02 | MediaPipe Pose fails | Posture flagged N/A; face + audio analysis proceed; user notified |
| FR-ERR-03 | Whisper returns empty or garbled transcript | Transcript flagged; WPM + filler metrics N/A; Groq receives `"transcription_failed": true` flag in prompt |
| FR-ERR-04 | Groq API call fails (rate limit / timeout / network) | Fall back to rule-based advice strings pre-written per CEFR band × metric; banner: "AI coach temporarily unavailable — showing standard feedback" |
| FR-ERR-05 | Upload fails mid-transfer | Auto-retry 3× with exponential backoff (5s, 10s, 20s); partial uploads cleaned up; user notified on final failure |
| FR-ERR-06 | Processing exceeds 3 minutes | Progress spinner with estimated time shown; no silent failures; slow stage logged for review |

### 7.6 Feedback Dashboard

| ID | Requirement | Priority |
|---|---|---|
| FR-DASH-01 | Overall CEFR Band Score displayed as circular progress ring (primary anchor) | High |
| FR-DASH-02 | Transcript with semantic highlighting: green = strong vocabulary, red = filler words | High |
| FR-DASH-03 | WPM line chart over session duration | High |
| FR-DASH-04 | Posture score badge (Good / Needs Work / Poor) + numeric score + bar indicator | High |
| FR-DASH-05 | Actionable Advice Cards (max 5) from Groq/Llama 3.3; fallback to rule-based cards if Groq fails | High |
| FR-DASH-06 | Downloadable PDF report | Low |

### 7.7 Longitudinal Progress Tracking

| ID | Requirement | Priority |
|---|---|---|
| FR-PROG-01 | Band Score Timeline chart: predicted MUET band plotted across all sessions | High |
| FR-PROG-02 | Per-metric sparkline trend charts: filler count, eye contact %, WPM avg, posture score across sessions | High |
| FR-PROG-03 | Green indicator for improving metrics; amber indicator for declining metrics | Medium |
| FR-PROG-04 | Side-by-side comparison of any two past sessions | Medium |

### 7.8 Educator Module

| ID | Requirement | Priority |
|---|---|---|
| FR-EDU-01 | Create presentation assignments (title, description, rubric, deadline, exam mode toggle) | High |
| FR-EDU-02 | Create/edit/assign custom rubrics or select MUET/SPM presets | High |
| FR-EDU-03 | View all student submission reports with AI scores and full analytics | High |
| FR-EDU-04 | HITL override: adjust AI band score + add written qualitative feedback | High |
| FR-EDU-05 | Class-wide aggregated analytics per assignment: average WPM, band score, top filler words, eye contact %, posture score | High |
| FR-EDU-06 | Filter analytics by assignment, date range, or individual student | Medium |

---

## 8. Database Schema

> Hosted on **Supabase PostgreSQL**. Supabase Auth manages the `auth.users` table automatically; the `users` table below extends it with app-specific fields.

### Tables

#### `users`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | References `auth.users.id` |
| `email` | TEXT | |
| `role` | TEXT | `student` or `educator` |
| `full_name` | TEXT | |
| `consent_given` | BOOLEAN | Default false |
| `consent_timestamp` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

#### `assignments`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `educator_id` | UUID (FK → users.id) | |
| `title` | TEXT | |
| `description` | TEXT | |
| `rubric_id` | UUID (FK → rubrics.id) | |
| `deadline` | TIMESTAMPTZ | |
| `exam_mode` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

#### `rubrics`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | TEXT | |
| `type` | TEXT | `muet`, `spm`, or `custom` |
| `criteria` | JSONB | Array of `{name, weight}` objects |
| `created_by` | UUID (FK → users.id) | |

#### `presentations`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `student_id` | UUID (FK → users.id) | |
| `assignment_id` | UUID (FK → assignments.id, nullable) | Null = free practice |
| `duration_secs` | INTEGER | |
| `video_path` | TEXT | Supabase Storage path |
| `audio_path` | TEXT | Supabase Storage path |
| `uploaded_at` | TIMESTAMPTZ | |
| `status` | TEXT | `processing`, `complete`, `failed` |

#### `feedback_reports`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `presentation_id` | UUID (FK → presentations.id) | |
| `band_score` | FLOAT | Predicted MUET band (1.0–6.0) |
| `wpm_avg` | FLOAT | |
| `filler_count` | INTEGER | |
| `filler_density` | FLOAT | Per minute |
| `eye_contact_pct` | FLOAT | |
| `posture_score` | FLOAT | 0–100 |
| `transcript` | TEXT | Full Whisper transcript |
| `pace_timeseries` | JSONB | `[{time_sec, wpm}, ...]` |
| `advice_cards` | JSONB | `[{icon, text}, ...]` — from Groq |
| `confidence_flags` | JSONB | `{audio_ok, face_ok, pose_ok}` |
| `generated_at` | TIMESTAMPTZ | |

#### `educator_overrides`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `report_id` | UUID (FK → feedback_reports.id) | |
| `educator_id` | UUID (FK → users.id) | |
| `override_band` | FLOAT | |
| `written_feedback` | TEXT | |
| `override_at` | TIMESTAMPTZ | |

#### `session_history`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `student_id` | UUID (FK → users.id) | |
| `report_id` | UUID (FK → feedback_reports.id) | |
| `session_date` | DATE | Used for progress trend charts |

#### `consent_log`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `user_id` | UUID (FK → users.id) | |
| `action` | TEXT | `accepted` or `withdrawn` |
| `timestamp` | TIMESTAMPTZ | |

---

## 9. Storage Architecture

> Hosted on **Supabase Storage** (free tier: 1 GB). Replaces Google Drive API from v2.0.

| Environment | Solution | Path Structure |
|---|---|---|
| Development | Local disk (`/uploads/`) | `uploads/{user_id}/{session_id}/video.webm` |
| Production | Supabase Storage bucket: `presentations` | `{user_id}/{session_id}/video.webm` and `/audio.wav` |

**Retention Policy:**
- Files retained 90 days after upload
- Weekly cron job on Railway backend flags expired files
- Student notified 7 days before deletion
- Manual extension available in Settings

**Storage Estimate for 30-User Pilot:**
- 30 students × 3 sessions × ~200 MB per session = ~18 GB worst-case
- Mitigation: cap recording at 720p (reduces to ~80–100 MB/session → ~9 GB total)
- If Supabase free tier (1 GB) is exceeded: upgrade to Pro ($25/month) or limit pilot sessions

> **Recommendation:** Cap video recording at 720p and 5 minutes max per session. This keeps pilot storage under 10 GB.

---

## 10. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-PERF-01 | Performance | AI report generation ≤90 seconds for ≤5-min recordings on Railway free tier (CPU-only) |
| NFR-PERF-02 | Performance | System handles ≤5 concurrent users during pilot without degradation |
| NFR-USE-01 | Usability | SUS score ≥75 in pilot testing. If <75, one-sprint remediation cycle before final evaluation |
| NFR-USE-02 | Usability | Card-based layout; max 5 advice cards; all metric labels defined inline |
| NFR-ACC-01 | Accuracy | Filler word detection ≥90% against manually annotated 20-video dataset |
| NFR-ACC-02 | Accuracy | Eye contact detection ≥90% against manually annotated dataset |
| NFR-ACC-03 | Accuracy | Posture detection ≥85% against manually annotated dataset |
| NFR-ACC-04 | Accuracy | Whisper WER ≤15% on Malaysian English test set |
| NFR-NET-01 | Network | Minimum 2 Mbps upload recommended; warn user if below threshold (non-blocking) |
| NFR-NET-02 | Network | Upload retry: 3 attempts with exponential backoff (5s, 10s, 20s) |
| NFR-NET-03 | Network | If network drops during recording, session saved locally; upload on reconnection |
| NFR-SEC-01 | Security | Video/audio in Supabase Storage with Row Level Security (RLS) — students only access own files |
| NFR-SEC-02 | Security | Supabase Auth handles password hashing (bcrypt); no plaintext passwords |
| NFR-SCA-01 | Scalability | Modular FastAPI architecture; RESTful endpoints designed for future LMS (Eklas) integration |
| NFR-COM-01 | Compatibility | Works on Chrome, Firefox, and Edge without plugins |

---

## 11. Success Metrics & Acceptance Criteria

| Metric | Target | Measurement Method | Remediation if Missed |
|---|---|---|---|
| Filler word detection accuracy | ≥90% | jiwer + manual annotation vs AI output (20-video dataset) | Refine Groq system prompt; re-test |
| Eye contact detection accuracy | ≥90% | Human annotation vs MediaPipe output | Adjust Euler angle threshold; re-calibrate |
| Posture detection accuracy | ≥85% | Human rating vs MediaPipe Pose output | Adjust landmark angle thresholds; document gap |
| Whisper WER (Malaysian English) | ≤15% | jiwer on 60-sample test set | Upgrade `tiny` → `base`; document final WER |
| SUS Usability Score | ≥75 / 100 | Post-session survey (n=30 students) | One sprint UI fixes; re-test same cohort |
| Speaking anxiety reduction | p < 0.05 (Paired t-test) | FLCAS pre/post (n=30, 4-week intervention) | Extend to 6 weeks; document Cohen's d |
| Report generation time | ≤90 sec (≤5-min video, CPU) | Railway server logs during pilot | Profile slowest stage; chunk audio or upgrade Whisper model |
| Educator HITL satisfaction | ≥3 of 5 educators rate module as "useful" or better | Post-pilot semi-structured interviews | Fix top 2 UX pain points from interviews |

---

## 12. Revised High-Level Timeline

| Phase | Duration | Key Deliverables | Gating Condition |
|---|---|---|---|
| Phase 1: Requirements & Data Setup | Month 1–2 | Proposal approved; UML diagrams; wireframes; DB schema finalised; Malaysian English dataset collection begins | Supervisor sign-off |
| Phase 2: Core Dev & AI Pipeline | Month 3–6 | Next.js + FastAPI scaffolded; Supabase integrated; WebRTC recording; Whisper ASR; MediaPipe Face + Pose; CEFR evaluation layer; error handling | Whisper WER ≤15% confirmed |
| Phase 3: NLP, Dashboard & Progress Tracking | Month 7–8 | Groq/Llama 3.3 integration; CEFR advice generation; Feedback Dashboard; longitudinal progress charts | Groq free tier confirmed sufficient for pilot |
| Phase 4: Educator Module & API | Month 9–10 | Educator Dashboard with aggregated analytics; HITL override; full RESTful API; end-to-end integration test | Integration test passing |
| Phase 5: Testing & Remediation | Month 11 | Pilot study (n=30 + 5); SUS + FLCAS surveys; model benchmarking; remediation sprint if SUS <75 | SUS ≥75 and p<0.05 confirmed |
| Phase 6: Final Submission | Month 12 | Final dissertation; evaluation report; system demo | All acceptance criteria met or documented |

---

## 13. Assumptions & Constraints

### 13.1 Assumptions
- Users have access to a modern browser, ≥2 Mbps connection, functional webcam and microphone
- Users have basic digital literacy to navigate the web application
- All presentations are delivered in English (Malaysian English accent supported via Whisper calibration)
- Pilot study operates within MSU's controlled academic environment with ethics consent

### 13.2 Known Constraints

| Constraint | Detail | Mitigation |
|---|---|---|
| Railway free tier: 512 MB RAM | Whisper `tiny` uses ~390 MB. Leaves ~120 MB for FastAPI + MediaPipe | Use `tiny` model; profile memory usage; upgrade to Railway Hobby ($5/mo) if needed |
| Supabase Storage free tier: 1 GB | 30 students × 3 sessions × 720p cap ≈ 9 GB | Cap video to 720p + 5 min max; upgrade if needed |
| Groq free tier: 30 req/min, 14,400 req/day | Sufficient for 30-user pilot; insufficient at scale | Queue Groq requests server-side; upgrade for production |
| Whisper `tiny` accuracy | May not reach ≤15% WER on all Malaysian accents | Benchmark early (T2.11); have `base` model ready as fallback |
| MUET Part 2 not supported | Single-speaker only in v1.0 | Show explicit "Coming in v2.0" placeholder in Exam Mode UI |
| PDPA compliance | Full compliance out of scope for prototype | Consent framework in place; formal legal review deferred |

---

## 14. Key Abbreviations

| Term | Definition |
|---|---|
| ASR | Automatic Speech Recognition |
| CEFR | Common European Framework of Reference for Languages |
| FLCAS | Foreign Language Classroom Anxiety Scale |
| Groq | Groq API — cloud LLM inference service (free tier) running Llama 3.3 70B |
| HITL | Human-in-the-Loop — educator score override mechanism |
| LLM | Large Language Model |
| Llama 3.3 | Meta's open-weight LLM (70B parameter model), served via Groq |
| MediaPipe | Google open-source framework for face mesh and pose landmark detection |
| MmLA | Multimodal Learning Analytics |
| MUET | Malaysian University English Test |
| NLP | Natural Language Processing |
| RLS | Row Level Security — Supabase's per-row access control |
| SNR | Signal-to-Noise Ratio — used for audio quality confidence scoring |
| SPM | Sijil Pelajaran Malaysia |
| SUS | System Usability Scale |
| WER | Word Error Rate |
| Whisper | OpenAI's open-source speech recognition model (self-hosted, `tiny` model) |
| WPM | Words Per Minute |
| ZPD | Zone of Proximal Development (Vygotsky) |
