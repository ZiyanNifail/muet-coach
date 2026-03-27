# Design System
## AI Presentation Coaching Tool — UI/UX Specification

> **Inspired by:** Nodum OS dark glassmorphism aesthetic
> **Author:** Ziyan Nifail
> **Version:** 1.0

---

## 1. Design Philosophy

The UI follows a **dark glassmorphism** aesthetic — deep backgrounds, frosted semi-transparent panels, subtle borders, and soft glows. Every surface feels like it exists in layered depth, not flat on a page. The interface should feel like a professional tool, not a student project.

**Three core principles:**
- **Depth over flatness** — panels float above the background through layering and transparency
- **Restraint** — no loud colours, no heavy gradients; colour is used only to signal meaning
- **Data clarity** — metrics and feedback are the hero; decoration never competes with content

---

## 2. Colour Palette

### Base Backgrounds
```css
--bg-base:        #0a0a0f;                    /* Page background — near black with blue undertone */
--bg-panel:       rgba(18, 18, 28, 0.75);     /* Main panels — dark, semi-transparent */
--bg-panel-hover: rgba(24, 24, 38, 0.85);     /* Panel hover state */
--bg-surface:     rgba(255, 255, 255, 0.04);  /* Inner cards / table rows */
--bg-surface-alt: rgba(255, 255, 255, 0.02);  /* Alternating rows */
```

### Borders & Dividers
```css
--border-subtle:  rgba(255, 255, 255, 0.06);  /* Default panel border */
--border-medium:  rgba(255, 255, 255, 0.10);  /* Hover / active border */
--border-strong:  rgba(255, 255, 255, 0.18);  /* Focused input border */
```

### Text
```css
--text-primary:   #e8e8f0;  /* Main body text */
--text-secondary: #8888a0;  /* Labels, subtitles, metadata */
--text-tertiary:  #55556a;  /* Placeholder text, disabled states */
```

### Accent Colours (used sparingly — colour signals meaning)
```css
--accent-green:      #22c55e;                   /* Success, active recording, good metrics */
--accent-green-dim:  rgba(34, 197, 94, 0.15);   /* Green surface tint */
--accent-amber:      #f59e0b;                   /* Warning, declining metrics */
--accent-amber-dim:  rgba(245, 158, 11, 0.15);  /* Amber surface tint */
--accent-red:        #ef4444;                   /* Error, poor metrics, filler word highlight */
--accent-red-dim:    rgba(239, 68, 68, 0.12);   /* Red surface tint */
--accent-blue:       #3b82f6;                   /* Primary actions, links, info */
--accent-blue-dim:   rgba(59, 130, 246, 0.12);  /* Blue surface tint */
--accent-purple:     #8b5cf6;                   /* Band score ring, CEFR level indicator */
```

### Status Indicator Dots (top-left of cards, like Nodum OS)
```css
--dot-active:     #22c55e;  /* Live recording, session in progress */
--dot-processing: #f59e0b;  /* AI analysis running */
--dot-complete:   #3b82f6;  /* Report ready */
--dot-error:      #ef4444;  /* Failed */
```

---

## 3. Typography

```css
--font-sans: 'Inter', 'SF Pro Display', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
| Role | Size | Weight | Colour | Usage |
|---|---|---|---|---|
| `display` | 28px | 600 | `--text-primary` | Page titles, hero headings |
| `heading-1` | 20px | 600 | `--text-primary` | Section headings, panel titles |
| `heading-2` | 16px | 500 | `--text-primary` | Card titles, subsection headings |
| `body` | 14px | 400 | `--text-primary` | Main content text |
| `body-sm` | 13px | 400 | `--text-secondary` | Supporting text, descriptions |
| `label` | 10px | 600 | `--text-tertiary` | ALL-CAPS section labels (e.g. `KNOWLEDGE GRAPH`) |
| `mono` | 12px | 400 | `--text-secondary` | Metrics, scores, IDs, timestamps |
| `mono-accent` | 12px | 600 | `--accent-green` | Live values, completion statuses |

### Section Label Pattern (directly from Nodum OS)
```css
.section-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  padding: 0 10px;
  margin-bottom: 6px;
}
```

---

## 4. Panel & Card System

### Base Panel (every major surface)
```css
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

### Card (smaller unit inside a panel)
```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 12px 14px;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.card:hover {
  background: var(--bg-panel-hover);
  border-color: var(--border-medium);
}
```

### Status Card (with Nodum OS-style indicator dot)
```css
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
}
.status-dot.active {
  background: var(--dot-active);
  box-shadow: 0 0 6px var(--dot-active);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

### Metric Card (Band Score, WPM, Eye Contact, Posture)
```css
.metric-card .metric-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.metric-card .metric-value {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}
.metric-card .metric-sub {
  font-size: 12px;
  color: var(--text-secondary);
}
```

---

## 5. Layout

### App Shell
```
┌──────────────────────────────────────────────────────────┐
│  TOPBAR  (logo · breadcrumb · mode badge · user menu)    │  48px
├──────────────┬───────────────────────────────────────────┤
│              │                                           │
│   SIDEBAR    │             MAIN CONTENT                  │
│   (220px)    │             (flex, scrollable)            │
│              │                                           │
│  section     │   panels · cards · charts                 │
│  labels +    │                                           │
│  nav items   │                                           │
│              │                                           │
└──────────────┴───────────────────────────────────────────┘
```

### Sidebar Nav Item
```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.nav-item:hover  { background: var(--bg-surface); color: var(--text-primary); }
.nav-item.active { background: var(--accent-blue-dim); color: var(--accent-blue); }
```

### Student Sidebar Sections
```
PRACTICE
  ▸ Unguided Session
  ▸ Guided Session
  ▸ Exam Mode

PROGRESS
  ▸ Band Timeline
  ▸ Metric Trends
  ▸ Session History

COURSES
  ▸ My Courses
```

### Educator Sidebar Sections
```
COURSES
  ▸ BEL 311
  ▸ MUET Prep A

MANAGEMENT
  ▸ Assignments
  ▸ Student Requests
  ▸ Analytics

PENDING
  ▸ Awaiting Approval  (3)
```

---

## 6. Component Specifications

### 6.1 Topbar
- Height: 48px
- Background: `var(--bg-panel)` + `border-bottom: 1px solid var(--border-subtle)`
- Left: app logo + breadcrumb
- Centre: current page title
- Right: mode badge pill + user avatar/name

Mode badge:
```css
.mode-badge {
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 999px;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
}
```

---

### 6.2 Registration — Role Selector
Two large cards on the registration page. Selecting one highlights it with `--accent-blue-dim` border. Selecting Educator shows an info banner: "Your account will be reviewed by an admin before Educator features are unlocked."

```
┌──────────────────────┐   ┌──────────────────────┐
│                      │   │                      │
│       🎓             │   │       📋             │
│   STUDENT            │   │   EDUCATOR           │
│                      │   │                      │
│  Practice sessions,  │   │  Manage courses,     │
│  feedback, progress  │   │  review students,    │
│  tracking.           │   │  override AI scores. │
│                      │   │                      │
└──────────────────────┘   └──────────────────────┘
                                 ↑ pending approval badge shown after selection
```

Educator pending state badge:
```css
.pending-badge {
  background: var(--accent-amber-dim);
  color: var(--accent-amber);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 13px;
}
```

---

### 6.3 Practice Mode Selector
```
┌───────────────────────────┐  ┌───────────────────────────┐
│  ○  UNGUIDED SESSION      │  │  ○  GUIDED SESSION        │
│                           │  │                           │
│  Baseline analysis.       │  │  Real-time coaching.      │
│  AI evaluates only after  │  │  Warnings appear when     │
│  session ends. No         │  │  you speak too fast or    │
│  interruptions.           │  │  lose eye contact.        │
│                           │  │                           │
│           [ Start → ]     │  │           [ Start → ]     │
└───────────────────────────┘  └───────────────────────────┘
```

---

### 6.4 Topic Scroll Wheel Modal
Triggered immediately after mode is selected.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ● SELECTING YOUR TOPIC                          │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  ░░ Climate Change ░░░░░░░░░░░░░░░░░░░░░░ │  │  ← blurred
│  │  ░░ Social Media Usage ░░░░░░░░░░░░░░░░░░ │  │  ← blurred
│  │▌                                          ▐│  │
│  │    Education in Malaysia                   │  │  ← LOCKED (highlighted)
│  │▌                                          ▐│  │
│  │  ░░ Technology & Society ░░░░░░░░░░░░░░░░ │  │  ← blurred
│  │  ░░ Health & Wellness ░░░░░░░░░░░░░░░░░░░ │  │  ← blurred
│  └────────────────────────────────────────────┘  │
│                                                  │
│         [ Spin Again ]    [ Use This Topic → ]   │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Behaviour:**
- On open: wheel spins automatically for 1.5–2.5 seconds (randomised)
- Easing: `cubic-bezier(0.15, 0.85, 0.4, 1)` — fast scroll, soft deceleration into lock
- Blurred rows: `filter: blur(1.5px)`, `color: var(--text-tertiary)`, `opacity: 0.5`
- Locked row: full `var(--text-primary)`, `border-top` and `border-bottom` in `var(--border-medium)`
- "Spin Again" re-randomises and re-spins
- "Use This Topic" saves `topic_id` to session record, closes modal, starts brainstorm phase

---

### 6.5 Brainstorm Panel (1-minute prep timer)
Shown after topic is locked, before recording begins. Full-screen panel overlay.

```
┌──────────────────────────────────────────────────────┐
│  BRAINSTORM                              ⏱  0:58     │
│  Topic: Education in Malaysia                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │                                              │   │
│  │  Jot down your key points...                 │   │
│  │                                              │   │
│  │                                              │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Your notes are saved for your reference only.       │
│  The AI does not assess your written notes.          │
│                                                      │
│                        [ Skip ]   [ I'm Ready → ]   │
└──────────────────────────────────────────────────────┘
```

Timer colour transitions:
- `> 0:20` → `var(--accent-green)` (default)
- `≤ 0:20` → `var(--accent-amber)` with transition
- `≤ 0:10` → `var(--accent-red)` with transition
- `0:00` → auto-advance to recording interface

---

### 6.6 Recording Interface
```
┌──────────────────────────────────────────────────────┐
│  ● RECORDING              Education in Malaysia      │
│  ┌────────────────────────────────────────────────┐  │
│  │                                                │  │
│  │                  [webcam feed]                 │  │
│  │                                                │  │
│  │  ▁▂▄▃▅▂▁▃▄▅▃▂▁▂▃▄▅▂▁  (audio waveform)       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  01:47 ━━━━━━━━━━━━━━━━━━○──────────  (progress)    │
│                                                      │
│  [ ⏸ Pause ]                  [ ⏹ Stop & Analyse ] │
└──────────────────────────────────────────────────────┘
```

**Guided mode — real-time warning overlays (slide in from top, auto-dismiss after 4 sec):**

```css
.warning-overlay {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--accent-amber);
  backdrop-filter: blur(8px);
  animation: slideDown 0.25s ease;
  white-space: nowrap;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

Warning triggers:
| Trigger | Message | Colour |
|---|---|---|
| WPM > 160 for 10s | "⚡ Speaking too fast — aim for 130–150 WPM" | Amber |
| WPM < 100 for 10s | "🐢 Speaking too slowly — pick up the pace" | Amber |
| Eye gaze off-camera > 3s | "👁 Look toward the camera" | Amber |
| Filler word detected 3× in 30s | "💬 Watch your filler words (um, uh)" | Amber |
| No face detected > 5s | "📷 Move closer to the camera" | Red |

---

### 6.7 Feedback Results Panel
Styled like the Nodum OS `SYSTEM OPERATIONS` + `I/O TELEMETRY` right panel.

```
┌──────────────────────────────────────────────────────┐
│  FEEDBACK REPORT                        COMPLETED ✓  │
│  Education in Malaysia · 02:00 · Guided Session      │
│                                                      │
│  ┌──────────┐ ┌──────┐ ┌──────────┐ ┌────────────┐  │
│  │ BAND     │ │ WPM  │ │  EYE     │ │  POSTURE   │  │
│  │  4.5     │ │  142 │ │  68%     │ │  Good      │  │
│  └──────────┘ └──────┘ └──────────┘ └────────────┘  │
│                                                      │
│  TRANSCRIPT                                          │
│  "...the education system in [um] Malaysia has       │
│  evolved significantly over the past decade..."      │
│                                                      │
│  PACE (WPM OVER TIME)                                │
│  [recharts line chart]                               │
│                                                      │
│  INSIGHTS                              5 NODES       │
│  ▸ Reduce filler words                 HIGH IMPACT   │
│  ▸ Maintain eye contact > 70%          MED IMPACT    │
│  ▸ Expand vocabulary range             MED IMPACT    │
│  ▸ Use discourse markers               LOW IMPACT    │
│  ▸ Vary sentence length                LOW IMPACT    │
└──────────────────────────────────────────────────────┘
```

---

### 6.8 Educator Dashboard
Left panel mirrors Nodum OS `KNOWLEDGE GRAPH`:
```
COURSES
  ▸ BEL 311 — Speaking Skills      12 students
  ▸ MUET Prep Cohort A             8 students

PENDING
  ▸ Join Requests                  3 pending
  ▸ Educator Verification          awaiting admin

ANALYTICS
  ▸ Class Overview
  ▸ Assignment Results
```

Right panel shows class-wide telemetry (avg WPM, avg band, top filler words) styled like the Nodum OS `I/O TELEMETRY` section with label + value rows and completion badges.

---

## 7. Form Elements

### Input Field
```css
.input {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-primary);
  width: 100%;
  outline: none;
  transition: border-color 0.15s;
}
.input:focus     { border-color: var(--border-strong); }
.input::placeholder { color: var(--text-tertiary); }
```

### Button Variants
```css
/* Primary */
.btn-primary {
  background: var(--accent-blue);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.88; }

/* Ghost / Secondary */
.btn-secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-medium);
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn-secondary:hover { border-color: var(--border-strong); color: var(--text-primary); }

/* Danger */
.btn-danger {
  background: var(--accent-red-dim);
  color: var(--accent-red);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
```

### Badge / Pill
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.badge-blue   { background: var(--accent-blue-dim);  color: var(--accent-blue); }
.badge-green  { background: var(--accent-green-dim); color: var(--accent-green); }
.badge-amber  { background: var(--accent-amber-dim); color: var(--accent-amber); }
.badge-red    { background: var(--accent-red-dim);   color: var(--accent-red); }
```

---

## 8. Animation & Motion

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Panel appear | `opacity 0→1` + `translateY(6px→0)` | 200ms | `ease-out` |
| Card hover | `border-color`, `background` | 150ms | `ease` |
| Modal open | `opacity 0→1` + `scale(0.97→1)` | 180ms | `ease-out` |
| Warning overlay | `translateY(-8px→0)` + `opacity` | 250ms | `ease` |
| Topic wheel spin | `translateY` scroll | 1500–2500ms | `cubic-bezier(0.15, 0.85, 0.4, 1)` |
| Recording dot | `opacity 1→0.4→1` | 2000ms | `ease-in-out` infinite |
| Timer warning transition | `color`, `background` | 300ms | `ease` |

---

## 9. Tailwind CSS Configuration

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-base':    '#0a0a0f',
        'bg-panel':   'rgba(18,18,28,0.75)',
        'bg-surface': 'rgba(255,255,255,0.04)',
        'border-subtle': 'rgba(255,255,255,0.06)',
        'border-medium': 'rgba(255,255,255,0.10)',
        'border-strong': 'rgba(255,255,255,0.18)',
        'text-base':  '#e8e8f0',
        'text-muted': '#8888a0',
        'text-dim':   '#55556a',
        accent: {
          green:  '#22c55e',
          amber:  '#f59e0b',
          red:    '#ef4444',
          blue:   '#3b82f6',
          purple: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: { panel: '12px' },
      borderRadius: { panel: '12px', card: '8px' }
    }
  }
}
```

---

## 10. Page Map

| Route | Description | Key Components |
|---|---|---|
| `/auth/register` | Registration with role selection | Role selector cards, consent checkbox, educator pending state |
| `/auth/login` | Login | Email/password form |
| `/dashboard` | Student home | Metric cards, progress snapshot, Start Practice CTA |
| `/practice` | Session flow | Mode selector → topic wheel → brainstorm panel → recording interface |
| `/results/[id]` | Post-session report | Band ring, metric cards, transcript, WPM chart, advice cards |
| `/progress` | Longitudinal tracking | Band timeline, sparklines, session comparison |
| `/history` | Past sessions list | Date, topic, band, mode, duration |
| `/courses` | Student's enrolled courses | Course list, join-by-code input |
| `/educator/dashboard` | Educator home | Course list, pending requests, class analytics |
| `/educator/courses/[id]` | Course detail | Student roster, submissions, assignments |
| `/educator/review/[id]` | Submission review | Video player, AI metrics, HITL override |
| `/admin` | Admin panel | Educator approval queue |
