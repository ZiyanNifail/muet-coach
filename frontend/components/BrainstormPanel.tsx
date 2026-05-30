'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ArrowRight, SkipForward, X, Sparkles, PenLine, Loader2 } from 'lucide-react'
import { Button } from './ui/Button'
import { fadeUp, springPop, staggerContainer, staggerItem } from '@/lib/motion'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface BrainstormPanelProps {
  topic: string
  onReady: (notes: string, aiPoints?: string[]) => void
  onSkip: () => void
  onClose?: () => void
  hideAI?: boolean
}

type Phase = 'choice' | 'loading' | 'ready'

export function BrainstormPanel({ topic, onReady, onSkip, onClose, hideAI }: BrainstormPanelProps) {
  const [phase, setPhase] = useState<Phase>(hideAI ? 'ready' : 'choice')
  const [notes, setNotes] = useState('')
  const [aiPoints, setAiPoints] = useState<string[]>([])
  const [aiChosen, setAiChosen] = useState(false)
  const [aiFailed, setAiFailed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    if (phase !== 'ready') return
    if (timeLeft <= 0) { onReady(notes); return }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  async function handleAIBrainstorm() {
    setAiChosen(true)
    setAiFailed(false)
    setPhase('loading')
    try {
      const form = new FormData()
      form.append('topic', topic)
      const res = await fetch(`${API_URL}/api/presentations/brainstorm`, {
        method: 'POST',
        body: form,
      })
      if (res.ok) {
        const data = await res.json()
        const pts: string[] = data.points || []
        if (pts.length > 0) {
          setAiPoints(pts)
        } else {
          setAiFailed(true)
        }
      } else {
        setAiFailed(true)
      }
    } catch {
      setAiFailed(true)
    }
    setPhase('ready')
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`

  let timerColor = '#22c55e'
  if (timeLeft <= 10) timerColor = '#ef4444'
  else if (timeLeft <= 20) timerColor = '#f59e0b'

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-xl flex flex-col gap-4 rounded-2xl border p-6"
        style={{
          background: 'var(--bg-panel)',
          borderColor: 'var(--border-medium)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          transition: 'background 0.3s ease, color 0.3s ease',
        }}
        variants={springPop}
        initial="hidden"
        animate="visible"
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
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
            {phase === 'ready' && (
              <div
                className="flex items-center gap-1.5 font-mono text-2xl font-semibold"
                style={{ color: timerColor, transition: 'color 0.3s ease' }}
              >
                <Clock size={20} style={{ color: timerColor, transition: 'color 0.3s ease' }} />
                {timeStr}
              </div>
            )}
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

        <AnimatePresence mode="wait">

        {/* ── Phase: choice ──────────────────────────────────────────────────── */}
        {phase === 'choice' && (
          <motion.div key="choice" className="flex flex-col gap-3" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Would you like help with talking points?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAIBrainstorm}
                className="flex-1 flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all"
                style={{ borderColor: 'rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.04)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(34,197,94,0.6)'
                  e.currentTarget.style.background = 'rgba(34,197,94,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(34,197,94,0.35)'
                  e.currentTarget.style.background = 'rgba(34,197,94,0.04)'
                }}
              >
                <Sparkles size={18} style={{ color: '#22c55e' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Give me points
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    AI suggests up to 5 ideas
                  </p>
                </div>
              </button>

              <button
                onClick={() => setPhase('ready')}
                className="flex-1 flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-medium)'
                  e.currentTarget.style.background = 'var(--bg-panel)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.background = 'var(--bg-surface)'
                }}
              >
                <PenLine size={18} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Think myself
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    Use the 60 s timer
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Phase: loading ─────────────────────────────────────────────────── */}
        {phase === 'loading' && (
          <motion.div key="loading" className="flex flex-col items-center gap-3 py-8" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
            <Loader2 size={24} className="animate-spin" style={{ color: '#22c55e' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Generating talking points…
            </p>
          </motion.div>
        )}

        {/* ── Phase: ready ───────────────────────────────────────────────────── */}
        {phase === 'ready' && (
          <motion.div key="ready" className="flex flex-col gap-4" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
            {aiChosen && aiPoints.length > 0 && (
              <div
                className="flex flex-col gap-1.5 rounded-xl border p-4"
                style={{ borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.04)' }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles size={12} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22c55e' }}>
                    AI Points
                  </span>
                </div>
                <motion.div className="flex flex-col gap-1.5" variants={staggerContainer} initial="hidden" animate="visible">
                  {aiPoints.map((pt, i) => (
                    <motion.div key={i} variants={staggerItem} className="flex items-start gap-2">
                      <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, lineHeight: '20px', flexShrink: 0 }}>
                        {i + 1}.
                      </span>
                      <span className="text-sm leading-5" style={{ color: 'var(--text-primary)' }}>{pt}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {aiChosen && aiFailed && (
              <div
                className="flex items-center gap-2 rounded-xl border px-4 py-3"
                style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.05)' }}
              >
                <span style={{ fontSize: 13, color: '#f59e0b' }}>⚠</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Couldn&apos;t generate points — jot your own ideas below.
                </span>
              </div>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down your key points…"
              rows={aiChosen && aiPoints.length > 0 ? 3 : 6}
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
              <Button onClick={() => onReady(notes, aiChosen && aiPoints.length > 0 ? aiPoints : undefined)}>
                I&apos;m Ready
                <ArrowRight size={14} className="ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
