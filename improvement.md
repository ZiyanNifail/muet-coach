# Presentation Coach FYP — Improvement Plan

> Generated: 2026-04-14
> Author: Ziyan Nifail (MSU FYP)

---

## Existing Components

### Backend (FastAPI — Railway)

#### Entry Point
| File | Responsibility |
|---|---|
| `backend/main.py` | App bootstrap, CORS configuration, router registration |

#### Routers (API Layer)
| File | Responsibility |
|---|---|
| `backend/routers/auth.py` | Register, login, JWT token issuance |
| `backend/routers/admin.py` | Admin user management |
| `backend/routers/courses.py` | Course CRUD, enrolment, invite codes (15 endpoints, auth-guarded) |
| `backend/routers/presentations.py` | Video upload, pipeline trigger |
| `backend/routers/submissions.py` | Assignment submission handling |
| `backend/routers/reports.py` | Fetch feedback reports, student history (auth-guarded, ownership-checked) |

#### Services (Business Logic)
| File | Responsibility |
|---|---|
| `backend/services/pipeline.py` | Orchestrates the full analysis pipeline end-to-end |
| `backend/services/whisper_service.py` | Speech transcription via Groq Whisper API; clarity score from `avg_logprob` |
| `backend/services/groq_service.py` | LLM feedback generation via Groq / Llama 3.3 70B |
| `backend/services/audio_service.py` | Audio extraction from uploaded video |
| `backend/services/video_service.py` | Video frame sampling for visual analysis |
| `backend/services/mediapipe_service.py` | Eye contact detection via MediaPipe iris landmark gaze estimation (478 landmarks, `refine_landmarks=True`) |
| `backend/services/voice_dynamics_service.py` | Pitch (pyin, 80–400 Hz) and energy (RMS dB) analysis via librosa |
| `backend/services/sentiment_service.py` | Spoken sentiment score via DistilBERT SST-2 (lazy-loaded, graceful degradation) |
| `backend/services/nlp_service.py` | Filler word detection, vocabulary analysis, pacing |
| `backend/services/cefr_evaluator.py` | Language proficiency level (CEFR A1–C2) derived from transcript |
| `backend/services/storage_service.py` | Supabase Storage upload/download |
| `backend/services/supabase_client.py` | Supabase DB client singleton |
| `backend/services/auth_deps.py` | JWT `get_current_user_id` FastAPI dependency |

#### AI Metrics Produced by Pipeline
| Metric | Source |
|---|---|
| `eye_contact_score` | mediapipe_service — iris gaze ratio |
| `pitch_mean_hz` | voice_dynamics_service — librosa pyin |
| `energy_mean_db` | voice_dynamics_service — librosa RMS |
| `sentiment_score` | sentiment_service — DistilBERT SST-2 (0–1) |
| `voice_clarity_score` | whisper_service — avg_logprob → 0–100 |
| `confidence_score` | pipeline — weighted composite formula |
| `filler_word_count` | nlp_service |
| `cefr_level` | cefr_evaluator |
| `llm_feedback` | groq_service — Llama 3.3 70B |

---

### Frontend (Next.js 16 + React 19 + Tailwind CSS v4 — Vercel)

#### Student Pages
| Route | Purpose |
|---|---|
| `/dashboard` | Student home, recent sessions summary |
| `/practice` | Practice mode selector (free / guided / timed) |
| `/courses` | Enrolled courses list |
| `/history` | Past presentation sessions list |
| `/progress` | Skill progress over time |
| `/results/[id]` | Full feedback report for a single session (ConfidenceCard + sub-metric tiles) |

#### Educator Pages
| Route | Purpose |
|---|---|
| `/educator/dashboard` | Educator home, class overview |
| `/educator/courses/new` | Create a new course |
| `/educator/courses/[id]` | Course detail, student roster |
| `/educator/courses/[id]/assignments/new` | Create a new assignment |
| `/educator/courses/[id]/submissions/[sid]` | View individual student submission |
| `/educator/analytics` | Class-wide analytics dashboard |
| `/educator/students` | All enrolled students overview |
| `/educator/submissions` | All submissions list |

#### Auth & Admin Pages
| Route | Purpose |
|---|---|
| `/login` | Student/educator login |
| `/register` | Account registration |
| `/admin` | Admin panel |

#### Shared Components
| Component | Purpose |
|---|---|
| `RecordingInterface.tsx` | Webcam/mic capture, countdown timer, live preview |
| `BrainstormPanel.tsx` | AI-assisted topic brainstorming |
| `TopicWheel.tsx` | Spinning random topic selector |
| `ConsentModal.tsx` | Recording consent gate |
| `Sidebar.tsx` | Student navigation sidebar (query-param aware active state) |
| `EducatorSidebar.tsx` | Educator navigation sidebar |
| `Topbar.tsx` | Top navigation bar |

#### UI Primitives (`components/ui/`)
| Component | Notes |
|---|---|
| `Button.tsx` | Primary = white/black; no blue |
| `Badge.tsx` | Gray variant (no blue) |
| `Input.tsx` | Form input |
| `shader-animation.tsx` | Three.js background shader |

#### Key Libraries
| Library | Use |
|---|---|
| Recharts | Charts and data visualisation |
| Framer Motion | Animations and transitions |
| SWR | Data fetching and caching |
| Supabase JS | Auth + DB client |
| Three.js | Shader animation background |
| Lucide React | Icon set |
| Sonner | Toast notifications |

---

## Known Issues / Warnings (Pre-existing)

| ID | Severity | Description |
|---|---|---|
| WARN-05 | Medium | SST-2 sentiment model trained on product reviews — may misread neutral academic speech as negative |
| WARN-11 | Low | `feedback_ratings` and `self_ratings` tables referenced in code but not in `supabase_setup.sql` |

---

## Improvement Plan

Ranked by **student learning impact** (primary) and implementation effort (secondary).

---

### Tier 1 — High Impact, Moderate Effort

#### IMP-01: Learning Path Recommendation Panel
- **What:** After each session, show a targeted recommendation — "Your weakest area this week is eye contact. Here are 3 drills."
- **How:** Fetch the last 5 sessions from the history API, identify the lowest-scoring metric, map it to a pre-written drill library, surface in a panel on `/results/[id]` and `/progress`.
- **Backend changes:** None (uses existing history endpoint).
- **Frontend changes:** New `LearningPathPanel.tsx` component; updates to `/results/[id]` and `/progress` pages.
- **Why it matters:** Students don't know *what* to practice next. Closing the gap between diagnosis and action is the highest-leverage intervention.
- **Status:** Pending (T3.08A in original task list)

---

#### IMP-02: Filler Word Highlights in Transcript
- **What:** Display the full transcript on the results page with filler words (um, uh, like, you know, basically, literally) highlighted in amber. Show total count, a per-filler breakdown table, and timestamps so students can replay those moments.
- **How:** Confirm `nlp_service.py` returns filler positions/timestamps alongside counts. Render transcript as annotated HTML in the results page.
- **Backend changes:** Verify/extend `nlp_service.py` to return `{word, timestamp_s}` list for each filler occurrence. Add to pipeline output and `FeedbackReport` Pydantic model.
- **Frontend changes:** New `TranscriptViewer.tsx` component with inline amber highlights; update `/results/[id]`.
- **Why it matters:** Students need to *see* exactly where they stumbled, not just read a count. Specific timestamps enable targeted self-review.
- **Status:** Pending

---

#### IMP-03: Session Replay with Timestamped Metric Annotations
- **What:** On the results page, overlay metric event markers on the video scrubber — red dot = low eye contact window, yellow = filler word spike, blue = low energy segment.
- **How:** Store per-second (or per-chunk) metric arrays in the pipeline output and DB. On the results page, render a custom scrubber with coloured markers alongside the video playback.
- **Backend changes:** Extend pipeline to emit time-series arrays (e.g., `eye_contact_timeline: [{t: 3.2, value: 0.1}, ...]`). Add new JSONB column to `presentations` table.
- **Frontend changes:** Custom video player component with annotation overlay.
- **Why it matters:** The most powerful coaching moment is watching yourself make the mistake in real time, not reading a static summary.
- **Status:** Pending

---

### Tier 2 — High Impact, Lower Effort (Quick Wins)

#### IMP-04: Progress Trend Charts on `/progress`
- **What:** Add Recharts sparkline/line charts for each metric (eye contact %, clarity score, confidence score, filler word count, pitch Hz) across the last 10 sessions.
- **How:** The `/progress` page and history API already exist. Add chart components using Recharts (already installed).
- **Backend changes:** None or minor — ensure history endpoint returns all metric fields per session.
- **Frontend changes:** Chart components on `/progress` page.
- **Why it matters:** Visible improvement is the strongest motivator. Students who see an upward trend keep practising.
- **Status:** Pending

---

#### IMP-05: Anonymised Peer Percentile Benchmarking
- **What:** On the results page, show "You scored higher in eye contact than 68% of students this week." Percentile computed from anonymised class data.
- **How:** Add a `/reports/percentile` endpoint that computes the student's rank within their course or cohort without exposing individual records.
- **Backend changes:** New endpoint in `reports.py`; aggregation query on Supabase.
- **Frontend changes:** `PercentileCard.tsx` component on `/results/[id]`.
- **Why it matters:** Benchmarking activates social motivation without violating privacy.
- **Status:** Pending (T4.01D/E in original task list)

---

#### IMP-06: Assignment Submission Status Visibility
- **What:** Students submitting to an educator assignment should see explicit status states: `Not Submitted → Processing → Analysed → Feedback Available`. Show in `/courses` and `/history`.
- **How:** Add a `status` enum column to the submissions table. Update pipeline to write status transitions. Surface in frontend with colour-coded badges.
- **Backend changes:** `submissions` table schema update; pipeline writes status; `submissions.py` router exposes status field.
- **Frontend changes:** Status badge on `/courses/[id]` and `/history` pages.
- **Why it matters:** Students currently have no feedback loop after submitting — they don't know if processing succeeded or failed.
- **Status:** Pending

---

### Tier 3 — Structural / Excellence Grade

#### IMP-07: Educator Custom Rubric Builder
- **What:** Let educators define per-assignment scoring rubrics — e.g., "weight eye contact 40%, vocabulary 30%, clarity 30%." The pipeline re-weights the composite confidence score accordingly.
- **How:** New `rubrics` DB table linked to assignments. Pass rubric weights to pipeline at analysis time.
- **Backend changes:** New `rubrics` table + CRUD endpoints; pipeline accepts optional weight overrides.
- **Frontend changes:** Rubric builder UI on `/educator/courses/[id]/assignments/new`.
- **Why it matters:** Different disciplines have different presentation standards. One rubric does not fit science, business, and arts equally.
- **Status:** Pending

---

#### IMP-08: Sentiment Model Replacement
- **What:** Replace DistilBERT SST-2 with a speech/presentation-appropriate sentiment or engagement classifier. Alternatively, use the LLM (Groq/Llama) to produce a nuanced confidence/engagement score from the transcript.
- **How:** Option A — fine-tuned classifier on presentation data. Option B — add a structured LLM prompt in `groq_service.py` that returns a JSON confidence rating alongside the narrative feedback.
- **Backend changes:** `sentiment_service.py` swap or `groq_service.py` extension.
- **Why it matters:** WARN-05 — SST-2 routinely misreads neutral academic speech as negative, producing inaccurate feedback that can demotivate students.
- **Status:** Pending

---

#### IMP-09: Dockerfile + CI Pipeline
- **What:** Containerise backend (FastAPI) and frontend (Next.js) with Dockerfiles. Add GitHub Actions workflow to lint, type-check, and build both services on every PR.
- **How:** `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`.
- **Why it matters:** Prevents regressions from reaching Railway/Vercel; makes deployments reproducible regardless of environment.
- **Status:** Pending (T4.11A/B in original task list)

---

#### IMP-10: Offline / Low-Bandwidth Recording Mode
- **What:** Allow students to record a practice session offline (PWA) and upload it automatically when connectivity is restored.
- **How:** Next.js PWA with service worker; IndexedDB for local video buffer; background sync API.
- **Why it matters:** Campus Wi-Fi is unreliable. Students lose practice opportunities due to connectivity, not lack of effort.
- **Status:** Pending (long-term)

---

## Implementation Priority Order

```
1.  IMP-01  Learning Path Recommendation Panel     ← highest educational value
2.  IMP-02  Filler Word Transcript Highlights      ← quick, visible, actionable
3.  IMP-04  Progress Trend Charts                  ← motivation and retention
4.  IMP-06  Assignment Submission Status           ← closes UX gap for students
5.  IMP-03  Session Replay Annotations             ← deepest learning moment
6.  IMP-05  Peer Percentile Benchmarking           ← social motivation
7.  IMP-07  Educator Rubric Builder                ← educator power feature
8.  IMP-08  Sentiment Model Replacement            ← accuracy fix (WARN-05)
9.  IMP-09  Dockerfile + CI Pipeline              ← excellence grade / devops
10. IMP-10  Offline Recording Mode                 ← long-term accessibility
```

---

## Notes

- All improvements assume the existing auth guard pattern (`Depends(get_current_user_id)`) is applied to any new endpoints.
- Tailwind CSS v4 is in use — configure styles via `@theme` in `globals.css`, not `tailwind.config.js`.
- No blue (`#3b82f6`) in UI — use gray/slate (`#94a3b8`) per established design system.
- New DB columns require corresponding `ALTER TABLE` statements appended to `supabase_setup.sql`.
