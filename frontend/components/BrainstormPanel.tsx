'use client'
import { useState, useEffect } from 'react'
import { Clock, ArrowRight, SkipForward } from 'lucide-react'
import { Button } from './ui/Button'

interface BrainstormPanelProps {
  topic: string
  onReady: (notes: string) => void
  onSkip: () => void
}

export function BrainstormPanel({ topic, onReady, onSkip }: BrainstormPanelProps) {
  const [notes, setNotes] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    if (timeLeft <= 0) { onReady(notes); return }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [timeLeft])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`

  let timerColor = '#22c55e'
  if (timeLeft <= 10) timerColor = '#ef4444'
  else if (timeLeft <= 20) timerColor = '#f59e0b'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)' }}
    >
      <div
        className="w-full max-w-xl flex flex-col gap-4 rounded-2xl border p-6"
        style={{
          background: 'rgba(14,14,22,0.55)',
          borderColor: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#55556a',
                marginBottom: 6,
              }}
            >
              Brainstorm
            </div>
            <p className="text-[#8888a0] text-sm">
              Topic:{' '}
              <span className="text-[#e8e8f0] font-medium">{topic}</span>
            </p>
          </div>

          {/* Timer */}
          <div
            className="flex items-center gap-1.5 font-mono text-2xl font-semibold shrink-0"
            style={{ color: timerColor, transition: 'color 0.3s ease' }}
          >
            <Clock size={20} style={{ color: timerColor, transition: 'color 0.3s ease' }} />
            {timeStr}
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jot down your key points..."
          rows={6}
          className="w-full resize-none rounded-xl border px-4 py-3 text-sm text-[#e8e8f0] placeholder:text-[#3a3a52] outline-none transition-colors"
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.07)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.16)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
        />

        <p style={{ fontSize: 11, color: '#44445a', letterSpacing: '0.01em' }}>
          Your notes are for your reference only — the AI does not assess written notes.
        </p>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onSkip}>
            <SkipForward size={14} className="mr-2" />
            Skip
          </Button>
          <Button onClick={() => onReady(notes)}>
            I&apos;m Ready
            <ArrowRight size={14} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
