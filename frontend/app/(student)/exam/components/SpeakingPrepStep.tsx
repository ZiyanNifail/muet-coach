'use client'
import { useState, useEffect } from 'react'
import { Clock, Mic } from 'lucide-react'

const PREP_SECS = 120

export function SpeakingPrepStep({ topic, onReady }: { topic: string; onReady: () => void }) {
  const [secsLeft, setSecsLeft] = useState(PREP_SECS)

  useEffect(() => {
    if (secsLeft <= 0) { onReady(); return }
    const id = setInterval(() => setSecsLeft((s) => s - 1), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secsLeft])

  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`
  const timerColor = secsLeft <= 20 ? 'var(--accent-red)' : secsLeft <= 40 ? '#f59e0b' : 'var(--accent-teal)'
  const pct = ((PREP_SECS - secsLeft) / PREP_SECS) * 100

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 md:px-6 gap-6 md:gap-8">
      <div className="text-center flex flex-col gap-1">
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Part 3: Speaking
        </p>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>You have 2 minutes to prepare</h2>
      </div>

      {/* Countdown ring */}
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" className="absolute top-0 left-0 -rotate-90">
          <circle cx="70" cy="70" r="60" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
          <circle
            cx="70" cy="70" r="60" fill="none"
            stroke={timerColor} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 60}`}
            strokeDashoffset={`${2 * Math.PI * 60 * (pct / 100)}`}
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
          />
        </svg>
        <div className="flex flex-col items-center">
          <Clock size={18} style={{ color: timerColor }} />
          <span className="font-mono text-3xl font-bold mt-1" style={{ color: timerColor }}>{timeStr}</span>
        </div>
      </div>

      {/* Topic card */}
      <div
        className="w-full max-w-md rounded-2xl border p-4 md:p-5 flex flex-col gap-2"
        style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Your topic
        </p>
        <p className="text-base font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{topic}</p>
      </div>

      <p className="text-xs max-w-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
        Jot down key points mentally. Recording will start automatically when preparation time ends.
      </p>

      <button
        onClick={onReady}
        className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold text-white transition-opacity min-h-[44px]"
        style={{ background: 'var(--accent-teal)' }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <Mic size={14} />
        Start Recording Now
      </button>
    </div>
  )
}
