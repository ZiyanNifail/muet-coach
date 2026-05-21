'use client'
import { useEffect, useState, useCallback } from 'react'
import { X, ArrowRight, CheckCircle } from 'lucide-react'

const STORAGE_KEY = 'precoach_tour_v1_done'
const PAD = 8

interface Step {
  selector: string
  title: string
  description: string
  emoji: string
}

const STEPS: Step[] = [
  {
    selector: 'a[href="/practice?mode=guided"]',
    title: 'Guided Session',
    emoji: '🎯',
    description: 'The AI coaches you in real time as you speak — it flags filler words, alerts you when you look away, and tracks your speaking pace live.',
  },
  {
    selector: 'a[href="/practice?mode=unguided"]',
    title: 'Unguided Session',
    emoji: '🎙️',
    description: 'Practice freely with no interruptions. Just record yourself speaking on any topic and get a full AI analysis report when you\'re done.',
  },
  {
    selector: 'a[href="/upload"]',
    title: 'Upload Video',
    emoji: '📤',
    description: 'Already have a recording? Upload any video file and get the same AI coaching feedback — band score, transcript, and insights.',
  },
  {
    selector: 'a[href="/progress"]',
    title: 'Band Timeline',
    emoji: '📈',
    description: 'See your MUET band score plotted over every session. Watch it climb as you practise — this is your progress chart.',
  },
  {
    selector: 'a[href="/history"]',
    title: 'Session History',
    emoji: '🗂️',
    description: 'Every session you\'ve ever recorded is saved here. Tap any row to revisit the full feedback report and see how you\'ve improved.',
  },
  {
    selector: 'a[href="/courses"]',
    title: 'My Courses',
    emoji: '📚',
    description: 'Your educator can enrol you in courses and set assignments. Check here for tasks, deadlines, and exam invitations.',
  },
  {
    selector: '[data-tour="section-improve"]',
    title: 'Improve Your Skills',
    emoji: '🏋️',
    description: 'Five targeted exercises live here — mock exams, filler word drills, pronunciation practice, a listening test, and a writing test. Use these to sharpen weak areas between sessions.',
  },
  {
    selector: '[data-tour="practice-calendar"]',
    title: 'Practice Calendar',
    emoji: '📅',
    description: 'Every day you record a session, that date lights up green. Hover any green day to see your band score. Use this to build a daily practice habit.',
  },
]

function useRect(selector: string, step: number) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  const measure = useCallback(() => {
    const el = document.querySelector(selector)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [selector])

  useEffect(() => {
    measure()
    // capture:true catches scroll on any nested scrollable element (e.g. the sidebar)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [measure, step])

  return rect
}

export function OnboardingTour({ forceShow = false }: { forceShow?: boolean }) {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // forceShow = user just accepted consent (definitely new); otherwise fall back to localStorage
    if (forceShow || !localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setActive(true), 500)
      return () => clearTimeout(t)
    }
  }, [forceShow])

  const rect = useRect(STEPS[step]?.selector ?? '', step)

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setActive(false)
  }, [])

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      finish()
    }
  }, [step, finish])

  if (!active) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  // Spotlight dimensions
  const sx = rect ? rect.left - PAD : 0
  const sy = rect ? rect.top - PAD : 0
  const sw = rect ? rect.width + PAD * 2 : 0
  const sh = rect ? rect.height + PAD * 2 : 0

  // Tooltip position — right of element if on left half, left of element if on right half
  const TOOLTIP_W = 268
  const onRightHalf = rect ? rect.left > window.innerWidth / 2 : false
  const tooltipTop = rect ? Math.max(rect.top + rect.height / 2 - 90, 12) : 200
  const tooltipLeft = rect
    ? onRightHalf
      ? rect.left - TOOLTIP_W - 18
      : rect.right + 18
    : 240

  return (
    <div className="fixed inset-0 z-[300]">
      {/* SVG spotlight overlay */}
      {rect && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: 'block' }}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect x={sx} y={sy} width={sw} height={sh} rx="10" fill="black" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.68)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>
      )}

      {/* Highlight ring around target */}
      {rect && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: sx,
            top: sy,
            width: sw,
            height: sh,
            borderRadius: 10,
            border: '2px solid #3A7D6A',
            boxShadow: '0 0 0 3px rgba(58,125,106,0.25), 0 0 16px rgba(58,125,106,0.40)',
            animation: 'tour-pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute flex flex-col gap-3"
        style={{
          left: tooltipLeft,
          top: tooltipTop,
          width: 268,
          background: 'var(--bg-panel)',
          border: '1px solid rgba(58,125,106,0.25)',
          transition: 'background 0.3s ease, color 0.3s ease',
          borderRadius: 14,
          padding: '16px 18px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.30)',
        }}
      >
        {/* Arrow — points toward the highlighted element */}
        <div
          style={{
            position: 'absolute',
            ...(onRightHalf
              ? { right: -8, borderLeft: '8px solid var(--bg-panel)', borderRight: 'none', filter: 'drop-shadow(2px 0 1px rgba(58,125,106,0.15))' }
              : { left: -8, borderRight: '8px solid var(--bg-panel)', borderLeft: 'none', filter: 'drop-shadow(-2px 0 1px rgba(58,125,106,0.15))' }),
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
          }}
        />

        {/* Step counter */}
        <div className="flex items-center justify-between">
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#3A7D6A',
            }}
          >
            TOUR · {step + 1} / {STEPS.length}
          </div>
          <button
            onClick={finish}
            style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
            title="Skip tour"
          >
            <X size={13} />
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>{current.emoji}</span>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {current.title}
          </h3>
        </div>

        {/* Description */}
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {current.description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === step ? 'var(--accent-teal)' : i < step ? 'rgba(58,125,106,0.35)' : 'var(--border-medium)',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={finish}
            style={{
              flex: 1,
              padding: '7px 0',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Skip tour
          </button>
          <button
            onClick={next}
            style={{
              flex: 2,
              padding: '7px 0',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              background: '#3A7D6A',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {isLast ? (
              <>
                <CheckCircle size={13} />
                Done
              </>
            ) : (
              <>
                Next
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(58,125,106,0.25), 0 0 16px rgba(58,125,106,0.40); }
          50%       { box-shadow: 0 0 0 5px rgba(58,125,106,0.15), 0 0 28px rgba(58,125,106,0.55); }
        }
      `}</style>
    </div>
  )
}
