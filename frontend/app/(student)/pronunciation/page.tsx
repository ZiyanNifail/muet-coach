'use client'
import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import { AudioRecorder } from '@/components/AudioRecorder'
import { Badge } from '@/components/ui/Badge'
import { fadeUp, springPop, staggerContainer, staggerItem, easings } from '@/lib/motion'
import {
  Volume2, CheckCircle, XCircle, RotateCcw, ArrowRight,
  BookOpen, Lightbulb, ChevronRight, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const MAX_RETRIES = 3

// ── Types ─────────────────────────────────────────────────────────────────────

interface WordData {
  word: string
  ipa: string
  definition: string
  syllables: string[]
  stress_index: number
  syllable_tips: string[]
  examples: string[]
  usage_hint: string
}

interface SylResult {
  tries: number
  score: number | null
  pass: boolean
  exhausted: boolean // max retries reached
  tip: string
}

interface SentenceResult {
  transcript: string
  has_word: boolean
  score: number
  feedback: string
}

type Stage = 'input' | 'syllables' | 'sentence' | 'done'

// ── Helpers ───────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
  const R = 26
  const C = 2 * Math.PI * R
  const dash = (score / 100) * C
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 60 60">
          <circle cx={30} cy={30} r={R} fill="none" stroke={`${color}25`} strokeWidth={4} />
          <motion.circle
            cx={30} cy={30} r={R} fill="none"
            stroke={color} strokeWidth={4} strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${C}` }}
            animate={{ strokeDasharray: `${dash} ${C}` }}
            transition={{ duration: 1, ease: easings.smooth, delay: 0.1 }}
          />
        </svg>
        <span className="relative font-mono font-bold text-sm" style={{ color }}>{score}</span>
      </div>
      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>/ 100</span>
    </div>
  )
}

function StepIndicator({ stage }: { stage: Stage }) {
  const steps: { key: Stage | 'done'; label: string }[] = [
    { key: 'input', label: 'Enter Word' },
    { key: 'syllables', label: 'Syllables' },
    { key: 'sentence', label: 'Sentence' },
    { key: 'done', label: 'Complete' },
  ]
  const order = ['input', 'syllables', 'sentence', 'done']
  const current = order.indexOf(stage)

  return (
    <div className="flex items-center gap-0 mb-2">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: done ? 'var(--accent-teal)' : active ? 'var(--accent-teal-dim)' : 'var(--bg-surface)',
                  border: `1.5px solid ${done ? 'var(--accent-teal)' : active ? 'var(--accent-teal)' : 'var(--border-medium)'}`,
                  color: done ? '#fff' : active ? 'var(--accent-teal)' : 'var(--text-tertiary)',
                }}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className="text-[10px] font-medium whitespace-nowrap"
                style={{ color: active ? 'var(--accent-teal)' : done ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-10 h-px mb-4 mx-1"
                style={{ background: i < current ? 'var(--accent-teal)' : 'var(--border-subtle)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PronunciationPage() {
  const [stage, setStage] = useState<Stage>('input')
  const [inputWord, setInputWord] = useState('')
  const [validating, setValidating] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)

  const [wordData, setWordData] = useState<WordData | null>(null)
  const [currentSyl, setCurrentSyl] = useState(0)
  const [sylResults, setSylResults] = useState<SylResult[]>([])
  const [sylChecking, setSylChecking] = useState(false)

  const [sentenceResult, setSentenceResult] = useState<SentenceResult | null>(null)
  const [sentenceChecking, setSentenceChecking] = useState(false)
  const [sentenceBlob, setSentenceBlob] = useState<Blob | null>(null)

  const tokenRef = useRef<string>('')

  async function getToken() {
    if (tokenRef.current) return tokenRef.current
    const { data: { session } } = await supabase.auth.getSession()
    tokenRef.current = session?.access_token ?? ''
    return tokenRef.current
  }

  // ── Stage 1: validate word ──────────────────────────────────────────────────

  async function handleValidate() {
    const word = inputWord.trim()
    if (!word) return
    setValidating(true)
    setInputError(null)
    const token = await getToken()
    const authHdr = await getAuthHeaders()

    try {
      const res = await fetch(`${API_URL}/api/pronunciation/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify({ word }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInputError(data.detail || 'Could not validate this word. Please try another.')
        return
      }
      const wd: WordData = data
      setWordData(wd)
      setSylResults(
        wd.syllables.map(() => ({ tries: 0, score: null, pass: false, exhausted: false, tip: '' }))
      )
      setCurrentSyl(0)
      setStage('syllables')
    } catch {
      setInputError('Could not connect to the server. Please check your connection.')
    } finally {
      setValidating(false)
    }
  }

  // ── Stage 2: check syllable ─────────────────────────────────────────────────

  async function handleSyllableBlob(blob: Blob) {
    if (!wordData) return
    setSylChecking(true)
    const authHdr = await getAuthHeaders()

    try {
      const form = new FormData()
      form.append('audio', blob, 'syllable.webm')
      form.append('syllable', wordData.syllables[currentSyl])
      form.append('word', wordData.word)
      form.append('index', String(currentSyl))

      const res = await fetch(`${API_URL}/api/pronunciation/check-syllable`, {
        method: 'POST',
        headers: authHdr,
        body: form,
      })
      const data = await res.json()
      const passed: boolean = data.pass ?? false
      const score: number = data.score ?? 0
      const tip: string = data.tip ?? ''

      setSylResults((prev) => {
        const updated = [...prev]
        const cur = { ...updated[currentSyl] }
        cur.tries += 1
        cur.score = score
        cur.pass = passed
        cur.tip = tip
        cur.exhausted = !passed && cur.tries >= MAX_RETRIES
        updated[currentSyl] = cur
        return updated
      })
    } catch {
      // On error, increment tries silently so student can retry
      setSylResults((prev) => {
        const updated = [...prev]
        updated[currentSyl] = { ...updated[currentSyl], tries: updated[currentSyl].tries + 1 }
        return updated
      })
    } finally {
      setSylChecking(false)
    }
  }

  function advanceSyllable() {
    if (!wordData) return
    const next = currentSyl + 1
    if (next >= wordData.syllables.length) {
      setStage('sentence')
    } else {
      setCurrentSyl(next)
    }
  }

  // ── Stage 3: check sentence ─────────────────────────────────────────────────

  async function handleSentenceBlob(blob: Blob) {
    setSentenceBlob(blob)
    setSentenceChecking(true)
    setSentenceResult(null)
    const authHdr = await getAuthHeaders()

    try {
      const form = new FormData()
      form.append('audio', blob, 'sentence.webm')
      form.append('word', wordData!.word)

      const res = await fetch(`${API_URL}/api/pronunciation/check-sentence`, {
        method: 'POST',
        headers: authHdr,
        body: form,
      })
      const data = await res.json()
      setSentenceResult({
        transcript: data.transcript ?? '',
        has_word: data.has_word ?? false,
        score: data.score ?? 0,
        feedback: data.feedback ?? '',
      })
    } catch {
      setSentenceResult({
        transcript: '',
        has_word: false,
        score: 0,
        feedback: 'Could not process your recording. Please try again.',
      })
    } finally {
      setSentenceChecking(false)
    }
  }

  function reset() {
    setStage('input')
    setInputWord('')
    setInputError(null)
    setWordData(null)
    setCurrentSyl(0)
    setSylResults([])
    setSentenceResult(null)
    setSentenceBlob(null)
    tokenRef.current = ''
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const curSylResult = wordData ? sylResults[currentSyl] : null
  const sylPassCount = sylResults.filter((r) => r.pass).length

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl w-full">
      {/* Header */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
          IMPROVE
        </div>
        <div className="flex items-center gap-2.5">
          <Volume2 size={20} style={{ color: 'var(--accent-teal)' }} />
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Pronunciation Trainer</h1>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Enter any English word to learn how to pronounce it, syllable by syllable.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator stage={stage} />

      <AnimatePresence mode="wait">

      {/* ── Stage 1: Input ────────────────────────────────────────────────── */}
      {stage === 'input' && (
        <motion.div
          key="input"
          className="flex flex-col gap-5 rounded-2xl border p-6"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
          variants={fadeUp} initial="hidden" animate="visible" exit="exit"
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
              ENTER A WORD TO PRACTISE
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. beneficial, enthusiasm, articulate…"
                value={inputWord}
                onChange={(e) => { setInputWord(e.target.value); setInputError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && !validating && handleValidate()}
                className="flex-1 rounded-xl border px-4 py-3 text-base outline-none transition-colors"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent-teal)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
                autoFocus
              />
              <Button onClick={handleValidate} disabled={!inputWord.trim() || validating}>
                {validating
                  ? <><Loader2 size={14} className="mr-2 animate-spin" />Checking…</>
                  : <>Check Word <ChevronRight size={14} className="ml-1" /></>}
              </Button>
            </div>
            {inputError && (
              <p className="text-sm mt-2 flex items-center gap-1.5" style={{ color: 'var(--accent-red)' }}>
                <XCircle size={13} /> {inputError}
              </p>
            )}
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-col gap-2">
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              TRY ONE OF THESE
            </span>
            <div className="flex flex-wrap gap-2">
              {['beneficial', 'enthusiasm', 'articulate', 'perseverance', 'conscientious', 'eloquent'].map((w) => (
                <button
                  key={w}
                  onClick={() => { setInputWord(w); setInputError(null) }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: 'var(--accent-teal-dim)',
                    border: '1px solid rgba(58,125,106,0.18)',
                    color: 'var(--accent-teal)',
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Stage 2: Syllables ────────────────────────────────────────────── */}
      {stage === 'syllables' && wordData && (
        <motion.div key="syllables" className="flex flex-col gap-4" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
          {/* Word header card */}
          <div
            className="rounded-2xl border p-5 flex flex-col gap-3"
            style={{ background: 'rgba(58,125,106,0.05)', borderColor: 'rgba(58,125,106,0.15)' }}
          >
            <div className="flex items-start gap-4 flex-wrap">
              <div>
                <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{wordData.word}</span>
                {wordData.ipa && (
                  <span className="ml-3 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>{wordData.ipa}</span>
                )}
              </div>
            </div>
            {wordData.definition && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{wordData.definition}</p>
            )}
            {wordData.usage_hint && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2"
                style={{ background: 'rgba(58,125,106,0.08)', border: '1px solid rgba(58,125,106,0.12)' }}>
                <Lightbulb size={13} style={{ color: '#3A7D6A', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: 'var(--accent-teal)' }}>{wordData.usage_hint}</p>
              </div>
            )}
          </div>

          {/* Syllable chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {wordData.syllables.map((syl, i) => {
              const r = sylResults[i]
              const isCurrent = i === currentSyl
              const isDone = r?.pass || r?.exhausted
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <motion.div
                    className="px-4 py-2 rounded-xl font-mono font-semibold text-sm"
                    animate={{ scale: isCurrent ? 1.08 : 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    style={{
                      background: r?.pass
                        ? 'rgba(34,197,94,0.12)'
                        : r?.exhausted
                        ? 'rgba(239,68,68,0.08)'
                        : isCurrent
                        ? 'rgba(58,125,106,0.15)'
                        : 'var(--bg-surface)',
                      border: `1.5px solid ${
                        r?.pass ? 'rgba(34,197,94,0.35)'
                        : r?.exhausted ? 'rgba(239,68,68,0.25)'
                        : isCurrent ? 'rgba(58,125,106,0.40)'
                        : 'var(--border-subtle)'
                      }`,
                      color: r?.pass ? '#22c55e' : r?.exhausted ? 'var(--accent-red)' : isCurrent ? 'var(--accent-teal)' : 'var(--text-tertiary)',
                    }}
                  >
                    {i === wordData.stress_index ? <strong>{syl}</strong> : syl}
                  </motion.div>
                  {r?.pass && <CheckCircle size={12} style={{ color: '#22c55e' }} />}
                  {r?.exhausted && <XCircle size={12} style={{ color: '#ef4444' }} />}
                  {!isDone && isCurrent && (
                    <span className="text-[9px] font-bold" style={{ color: 'var(--accent-teal)' }}>NOW</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Active syllable practice card */}
          <div
            className="rounded-2xl border p-4 md:p-6 flex flex-col gap-5"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
          >
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                SYLLABLE {currentSyl + 1} OF {wordData.syllables.length}
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl font-bold font-mono" style={{ color: 'var(--accent-teal)' }}>
                  {wordData.syllables[currentSyl]}
                </span>
                {wordData.syllable_tips[currentSyl] && (
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{wordData.syllable_tips[currentSyl]}</span>
                )}
              </div>
            </div>

            {/* Recording UI — only show if no result yet, or last attempt failed */}
            {!sylChecking && (!curSylResult || (!curSylResult.pass && !curSylResult.exhausted)) && (
              <div className="flex flex-col items-center gap-4">
                <AudioRecorder
                  maxSecs={8}
                  onBlob={handleSyllableBlob}
                  disabled={sylChecking}
                  label={`Say: "${wordData.syllables[currentSyl]}"`}
                />
                {curSylResult && curSylResult.tries > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Attempt {curSylResult.tries} / {MAX_RETRIES}
                  </span>
                )}
              </div>
            )}

            {/* Checking spinner */}
            {sylChecking && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <Loader2 size={16} className="animate-spin" />
                Checking your pronunciation…
              </div>
            )}

            {/* Result display */}
            {!sylChecking && curSylResult && (curSylResult.score !== null) && (
              <motion.div className="flex flex-col gap-3" variants={springPop} initial="hidden" animate="visible">
                <div className="flex items-center gap-4">
                  <ScoreRing score={curSylResult.score} />
                  <div className="flex-1">
                    {curSylResult.pass ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={18} style={{ color: '#22c55e' }} />
                        <span className="font-semibold text-[#22c55e]">Great pronunciation!</span>
                      </div>
                    ) : curSylResult.exhausted ? (
                      <div className="flex items-center gap-2">
                        <XCircle size={18} style={{ color: '#ef4444' }} />
                        <span className="font-semibold text-[#ef4444]">Moving on, keep practising!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <RotateCcw size={16} style={{ color: '#f59e0b' }} />
                        <span className="font-semibold text-[#f59e0b]">Not quite, try again!</span>
                      </div>
                    )}
                    {curSylResult.tip && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{curSylResult.tip}</p>
                    )}
                  </div>
                </div>

                {(curSylResult.pass || curSylResult.exhausted) && (
                  <Button onClick={advanceSyllable}>
                    {currentSyl + 1 < wordData.syllables.length
                      ? <>Next Syllable <ArrowRight size={14} className="ml-1.5" /></>
                      : <>Continue to Sentence <ArrowRight size={14} className="ml-1.5" /></>}
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Stage 3: Sentence ─────────────────────────────────────────────── */}
      {stage === 'sentence' && wordData && (
        <motion.div key="sentence" className="flex flex-col gap-4" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
          {/* Context card */}
          <div
            className="rounded-2xl border p-5 flex flex-col gap-3"
            style={{ background: 'rgba(58,125,106,0.05)', borderColor: 'rgba(58,125,106,0.15)' }}
          >
            <div className="flex items-center gap-2">
              <BookOpen size={14} style={{ color: '#3A7D6A' }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3A7D6A' }}>
                HOW TO USE "{wordData.word.toUpperCase()}"
              </span>
            </div>
            {wordData.usage_hint && (
              <p className="text-sm font-medium" style={{ color: 'var(--accent-teal)' }}>{wordData.usage_hint}</p>
            )}
            {wordData.examples.length > 0 && (
              <div className="flex flex-col gap-2">
                {wordData.examples.slice(0, 3).map((ex, i) => (
                  <p key={i} className="text-xs pl-3 border-l-2" style={{ color: 'var(--text-secondary)', borderColor: 'rgba(58,125,106,0.25)' }}>
                    {ex}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Recording card */}
          <div
            className="rounded-2xl border p-4 md:p-6 flex flex-col gap-5"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
          >
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                YOUR TURN
              </div>
              <p className="mt-1.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                Say a sentence using the word{' '}
                <strong style={{ color: 'var(--accent-teal)' }}>{wordData.word}</strong>.
              </p>
            </div>

            {!sentenceResult && !sentenceChecking && (
              <AudioRecorder
                maxSecs={20}
                onBlob={handleSentenceBlob}
                disabled={sentenceChecking}
                label={`Use "${wordData.word}" in your own sentence`}
              />
            )}

            {sentenceChecking && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <Loader2 size={16} className="animate-spin" />
                Analysing your sentence…
              </div>
            )}

            {sentenceResult && !sentenceChecking && (
              <motion.div className="flex flex-col gap-4" variants={springPop} initial="hidden" animate="visible">
                {/* Transcript */}
                {sentenceResult.transcript && (
                  <div className="rounded-lg border px-4 py-3"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                      WHAT WE HEARD
                    </div>
                    <p className="text-sm italic" style={{ color: 'var(--text-primary)' }}>"{sentenceResult.transcript}"</p>
                  </div>
                )}

                {/* Score + feedback */}
                <div className="flex items-start gap-4">
                  <ScoreRing score={sentenceResult.score} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {sentenceResult.has_word ? (
                        <Badge variant="green">Word detected</Badge>
                      ) : (
                        <Badge variant="amber">Word not detected</Badge>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{sentenceResult.feedback}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                  {!sentenceResult.has_word || sentenceResult.score < 60 ? (
                    <Button variant="secondary" onClick={() => { setSentenceResult(null); setSentenceBlob(null) }}>
                      <RotateCcw size={13} className="mr-1.5" /> Try Again
                    </Button>
                  ) : null}
                  <Button onClick={() => setStage('done')}>
                    See Summary <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Stage 4: Done ─────────────────────────────────────────────────── */}
      {stage === 'done' && wordData && (
        <motion.div key="done" className="flex flex-col gap-4" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
          {/* Summary card */}
          <div
            className="rounded-2xl border p-4 md:p-6 flex flex-col gap-5"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  SESSION COMPLETE
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{wordData.word}</span>
                  {wordData.ipa && (
                    <span className="font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>{wordData.ipa}</span>
                  )}
                </div>
              </div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--accent-teal-dim)' }}>
                <CheckCircle size={28} style={{ color: 'var(--accent-teal)' }} />
              </div>
            </div>

            {/* Syllable breakdown */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                SYLLABLE RESULTS · {sylPassCount}/{wordData.syllables.length} passed
              </div>
              <motion.div className="flex flex-col gap-2" variants={staggerContainer} initial="hidden" animate="visible">
                {wordData.syllables.map((syl, i) => {
                  const r = sylResults[i]
                  return (
                    <motion.div key={i} variants={staggerItem} className="flex items-center gap-3 rounded-lg border px-3 py-2"
                      style={{
                        background: r?.pass ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.03)',
                        borderColor: r?.pass ? 'rgba(34,197,94,0.20)' : 'rgba(239,68,68,0.15)',
                      }}>
                      <span className="font-mono font-semibold text-sm w-16 md:w-20" style={{ color: 'var(--text-primary)' }}>{syl}</span>
                      {r?.pass
                        ? <><CheckCircle size={13} style={{ color: '#22c55e' }} /><span className="text-xs" style={{ color: '#22c55e' }}>Passed</span></>
                        : <><XCircle size={13} style={{ color: 'var(--accent-red)' }} /><span className="text-xs" style={{ color: 'var(--accent-red)' }}>Needs work</span></>
                      }
                      {r?.score !== null && (
                        <span className="ml-auto font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.score}/100</span>
                      )}
                    </motion.div>
                  )
                })}
              </motion.div>
            </div>

            {/* Sentence result */}
            {sentenceResult && (
              <div className="rounded-xl border p-4 flex items-center gap-4"
                style={{
                  background: sentenceResult.score >= 60 ? 'rgba(34,197,94,0.04)' : 'rgba(245,158,11,0.04)',
                  borderColor: sentenceResult.score >= 60 ? 'rgba(34,197,94,0.20)' : 'rgba(245,158,11,0.20)',
                }}>
                <ScoreRing score={sentenceResult.score} />
                <div className="flex-1">
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                    SENTENCE USAGE
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sentenceResult.feedback}</p>
                </div>
              </div>
            )}
          </div>

          {/* Try another word */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={reset}>
              <RotateCcw size={14} className="mr-1.5" />
              Try Another Word
            </Button>
            <Button variant="secondary" onClick={() => { setStage('input'); setInputWord('') }}>
              Practice Same Word Again
            </Button>
          </div>
        </motion.div>
      )}

      </AnimatePresence>
    </div>
  )
}
