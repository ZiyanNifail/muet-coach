'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { fadeUp, staggerContainer, staggerItem, springPop } from '@/lib/motion'
import { useNavigationGuard } from '@/lib/navGuard'

const FILLERS = [
  'um', 'uh', 'er', 'ah', 'like', 'you know', 'basically',
  'literally', 'actually', 'right', 'okay so', 'so yeah', 'kind of', 'sort of',
]

const DURATION = 60

type Phase = 'intro' | 'countdown' | 'recording' | 'done'

interface FillerHit {
  word: string
  at: number
}

function gradeLabel(count: number): { label: string; color: string; desc: string } {
  if (count === 0) return { label: 'Perfect', color: '#22c55e', desc: 'Flawless — no fillers detected.' }
  if (count <= 2) return { label: 'Excellent', color: '#3A7D6A', desc: 'Very clean speech. Minor slips only.' }
  if (count <= 5) return { label: 'Good', color: '#94a3b8', desc: 'A few fillers. Keep practising pauses.' }
  if (count <= 10) return { label: 'Needs Work', color: '#f59e0b', desc: 'Replace fillers with a deliberate pause.' }
  return { label: 'Poor', color: '#ef4444', desc: 'High filler density. Slow down and breathe.' }
}

export default function FillerDrillPage() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [countdown, setCountdown] = useState(3)
  const [secsLeft, setSecsLeft] = useState(DURATION)
  const [hits, setHits] = useState<FillerHit[]>([])
  const [lastHit, setLastHit] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)

  useNavigationGuard(phase === 'countdown' || phase === 'recording', 'the Filler Drill')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null)
  const seenRef = useRef<Set<string>>(new Set())
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) setSupported(false)
  }, [])

  const stopAll = useCallback(() => {
    if (recogRef.current) { try { recogRef.current.stop() } catch {} recogRef.current = null }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopAll(), [stopAll])

  function startCountdown() {
    setPhase('countdown')
    setCountdown(3)
    let c = 3
    const id = setInterval(() => {
      c--
      if (c <= 0) { clearInterval(id); startRecording() }
      else setCountdown(c)
    }, 1000)
  }

  function startRecording() {
    setPhase('recording')
    setSecsLeft(DURATION)
    setHits([])
    seenRef.current = new Set()
    startTimeRef.current = Date.now()

    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition!
    const recog = new SR()
    recog.lang = 'en-MY'
    recog.continuous = true
    recog.interimResults = true
    recogRef.current = recog

    recog.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript.toLowerCase()
        for (const filler of FILLERS) {
          const re = new RegExp(`\\b${filler}\\b`)
          if (re.test(transcript)) {
            const key = `${filler}-${Math.floor((Date.now() - startTimeRef.current) / 1500)}`
            if (!seenRef.current.has(key)) {
              seenRef.current.add(key)
              const at = Math.round((Date.now() - startTimeRef.current) / 1000)
              setHits(h => [...h, { word: filler, at }])
              setLastHit(filler)
              setTimeout(() => setLastHit(null), 800)
            }
          }
        }
      }
    }

    recog.onend = () => {
      if (recogRef.current) { try { recogRef.current.start() } catch {} }
    }

    recog.start()

    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!)
          stopAll()
          setPhase('done')
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  function reset() {
    stopAll()
    setPhase('intro')
    setHits([])
    setLastHit(null)
    setSecsLeft(DURATION)
  }

  const grade = gradeLabel(hits.length)
  const elapsed = DURATION - secsLeft
  const pct = (secsLeft / DURATION) * 100

  if (!supported) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm text-center flex flex-col gap-4">
          <p className="text-2xl">😕</p>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Browser not supported</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            This drill uses the Web Speech API. Please use Chrome or Edge.
          </p>
          <Link href="/dashboard"><Button variant="secondary">Back to Dashboard</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 min-h-[calc(100vh-48px)]">
      <AnimatePresence mode="wait">

      {/* ── Intro ── */}
      {phase === 'intro' && (
        <motion.div key="intro" className="max-w-md w-full flex flex-col gap-6" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              IMPROVE · FILLER WORD DRILL
            </div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>60-Second No-Filler Challenge</h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Speak freely for 60 seconds on any topic. Every <em>um</em>, <em>uh</em>, <em>er</em>, <em>like</em>, or similar filler is caught in real time.
            </p>
          </div>

          <div className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)', transition: 'background 0.3s ease' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Detected fillers include:</p>
            <div className="flex flex-wrap gap-1.5">
              {FILLERS.map(f => (
                <span key={f} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(58,125,106,0.08)', color: '#3A7D6A', border: '1px solid rgba(58,125,106,0.20)' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-4 flex flex-col gap-1.5" style={{ borderColor: 'rgba(245,158,11,0.22)', background: 'var(--accent-amber-dim)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--accent-amber)' }}>Tips</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>When you feel a filler coming — pause instead. Silence sounds more confident than <em>um</em>.</p>
          </div>

          <Button onClick={startCountdown} size="lg" className="w-full sm:w-auto min-h-[44px]">Start Challenge →</Button>
          <Link href="/dashboard" className="text-center text-xs transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            Back to Dashboard
          </Link>
        </motion.div>
      )}

      {/* ── Countdown ── */}
      {phase === 'countdown' && (
        <motion.div key="countdown" className="flex flex-col items-center gap-4" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Get ready to speak…</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={countdown}
              className="text-8xl font-bold font-mono"
              style={{ color: 'var(--accent-teal)' }}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {countdown}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Recording ── */}
      {phase === 'recording' && (
        <motion.div key="recording" className="max-w-sm w-full flex flex-col gap-6" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
          {/* Timer ring */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                <circle cx={64} cy={64} r={56} fill="none" stroke="var(--border-subtle)" strokeWidth={8} />
                <circle
                  cx={64} cy={64} r={56} fill="none"
                  stroke="var(--accent-teal)" strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - pct / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-mono min-w-[2ch] text-center" style={{ color: 'var(--text-primary)' }}>{secsLeft}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>secs left</span>
              </div>
            </div>

            {/* Live filler flash */}
            <div className="h-8 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {lastHit ? (
                  <motion.span
                    key={lastHit + Date.now()}
                    className="text-sm font-semibold px-3 py-1 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                    initial={{ opacity: 0, scale: 0.8, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    ⚠ &ldquo;{lastHit}&rdquo; detected
                  </motion.span>
                ) : (
                  <motion.span
                    key="listening"
                    className="text-xs flex items-center gap-1.5"
                    style={{ color: 'var(--text-tertiary)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    Listening…
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Running filler count */}
          <div className="rounded-xl border p-4 flex items-center justify-between"
            style={{ background: 'var(--bg-base)', borderColor: hits.length > 0 ? 'rgba(239,68,68,0.25)' : 'var(--border-subtle)', transition: 'background 0.3s ease' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fillers caught</span>
            <span className="text-2xl font-bold font-mono" style={{ color: hits.length === 0 ? '#22c55e' : '#ef4444' }}>
              {hits.length}
            </span>
          </div>

          {/* Hit log */}
          {hits.length > 0 && (
            <motion.div
              className="flex flex-wrap gap-1.5"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
              {hits.map((h, i) => (
                <motion.span
                  key={`${h.word}-${h.at}-${i}`}
                  variants={staggerItem}
                  layout
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.18)' }}
                >
                  {h.word} <span style={{ opacity: 0.6 }}>@{h.at}s</span>
                </motion.span>
              ))}
              </AnimatePresence>
            </motion.div>
          )}

          <Button variant="secondary" onClick={reset}>Stop Early</Button>
        </motion.div>
      )}

      {/* ── Results ── */}
      {phase === 'done' && (
        <motion.div key="done" className="max-w-sm w-full flex flex-col gap-5" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              DRILL COMPLETE
            </div>
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Your Result</h2>
          </div>

          {/* Score card */}
          <div className="rounded-xl border p-4 md:p-6 flex flex-col items-center gap-2 text-center"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}>
            <span className="text-5xl font-bold font-mono" style={{ color: grade.color }}>{hits.length}</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>fillers in {elapsed}s</span>
            <span className="text-sm font-semibold mt-1" style={{ color: grade.color }}>{grade.label}</span>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{grade.desc}</p>
          </div>

          {/* Breakdown */}
          {hits.length > 0 && (
            <div className="rounded-xl border p-4 flex flex-col gap-2"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)', transition: 'background 0.3s ease' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>What you said</p>
              <div className="flex flex-wrap gap-1.5">
                {hits.map((h, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.18)' }}>
                    {h.word} <span style={{ opacity: 0.6 }}>@{h.at}s</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {hits.length === 0 && (
            <div className="rounded-xl border p-4 text-center"
              style={{ borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.05)' }}>
              <p className="text-sm font-medium text-[#22c55e]">🏆 Zero fillers! Outstanding control.</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={startCountdown} className="flex-1 min-h-[44px]">Try Again</Button>
            <Link href="/practice?mode=guided" className="flex-1">
              <Button variant="secondary" className="w-full min-h-[44px]">Practice Session</Button>
            </Link>
          </div>
          <Link href="/dashboard" className="text-center text-xs transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            Back to Dashboard
          </Link>
        </motion.div>
      )}

      </AnimatePresence>
    </div>
  )
}
