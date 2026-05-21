'use client'
import { useState, useEffect } from 'react'
import { Clock, ArrowRight, SkipForward, X } from 'lucide-react'
import { Button } from './ui/Button'

interface BrainstormPanelProps {
  topic: string
  onReady: (notes: string) => void
  onSkip: () => void
  onClose?: () => void
}

export function BrainstormPanel({ topic, onReady, onSkip, onClose }: BrainstormPanelProps) {
  const [notes, setNotes] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    if (timeLeft <= 0) { onReady(notes); return }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          background: 'var(--bg-panel)',
          borderColor: 'var(--border-medium)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          transition: 'background 0.3s ease, color 0.3s ease',
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
                color: 'var(--text-tertiary)',
                marginBottom: 6,
              }}
            >
              Brainstorm
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Topic:{' '}
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{topic}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className="flex items-center gap-1.5 font-mono text-2xl font-semibold"
              style={{ color: timerColor, transition: 'color 0.3s ease' }}
            >
              <Clock size={20} style={{ color: timerColor, transition: 'color 0.3s ease' }} />
              {timeStr}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-subtle)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jot down your key points..."
          rows={6}
          className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
        />

        <p style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>
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
