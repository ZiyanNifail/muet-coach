'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import { LISTENING_QUESTIONS } from '@/lib/listeningQuestions'
import { TASK1_PROMPTS, TASK2_PROMPTS } from '@/lib/writingPrompts'
import { SectionPlayer } from '../listening/components/SectionPlayer'
import { Task1Panel } from '../writing/components/Task1Panel'
import { Task2Panel } from '../writing/components/Task2Panel'
import { RecordingInterface } from '@/components/RecordingInterface'
import { ExamIntro } from './components/ExamIntro'
import { SpeakingPrepStep } from './components/SpeakingPrepStep'
import { ExamResults } from './components/ExamResults'

type ExamStep =
  | 'intro'
  | 'listening_A' | 'listening_B' | 'listening_C'
  | 'listening_submitting' | 'listening_done'
  | 'writing_tasks' | 'writing_submitting' | 'writing_done'
  | 'speaking_prep' | 'speaking_record' | 'speaking_uploading' | 'speaking_processing'
  | 'results'

export interface ListeningResult {
  session_id: string
  section_scores: Record<string, { correct: number; total: number }>
  overall_band: number
  advice_cards: { impact: string; text: string }[]
}

export interface WritingResult {
  session_id: string
  task1_band: number
  task2_band: number
  overall_band: number
  advice_cards: { criterion: string; task: number; impact: string; text: string }[]
}

export interface SpeakingResult {
  presentation_id: string
  band_score: number
  wpm_avg: number | null
  eye_contact_pct: number | null
  advice_cards: { impact: string; text: string }[]
}

const WRITING_SECS = 90 * 60

const MUET_EXAM_TOPICS = [
  'The importance of digital literacy in the modern workplace',
  'Climate change and its impact on developing nations',
  'The role of social media in shaping public opinion',
  'Should higher education be free for all citizens?',
  'The advantages and disadvantages of remote work',
  'Youth unemployment: causes and solutions',
  'The impact of artificial intelligence on future careers',
  'How can communities reduce plastic waste effectively?',
]

export function ExamContent() {
  const [step, setStep] = useState<ExamStep>('intro')

  // Listening state
  const [listeningAnswers, setListeningAnswers] = useState<Record<string, string>>({})
  const [listeningResult, setListeningResult] = useState<ListeningResult | null>(null)

  // Writing state
  const [task1Text, setTask1Text] = useState('')
  const [task2Text, setTask2Text] = useState('')
  const [writingSecsLeft, setWritingSecsLeft] = useState(WRITING_SECS)
  const [writingResult, setWritingResult] = useState<WritingResult | null>(null)

  // Speaking state
  const [speakingTopic] = useState(() => MUET_EXAM_TOPICS[Math.floor(Math.random() * MUET_EXAM_TOPICS.length)])
  const [speakingResult, setSpeakingResult] = useState<SpeakingResult | null>(null)
  const [processStatus, setProcessStatus] = useState('')

  // Prompt selection (stable across renders)
  const task1Prompt = useMemo(() => TASK1_PROMPTS[Math.floor(Math.random() * TASK1_PROMPTS.length)], [])
  const task2Prompt = useMemo(() => TASK2_PROMPTS[Math.floor(Math.random() * TASK2_PROMPTS.length)], [])

  const questionsA = useMemo(() => LISTENING_QUESTIONS.filter((q) => q.section === 'A'), [])
  const questionsB = useMemo(() => LISTENING_QUESTIONS.filter((q) => q.section === 'B'), [])
  const questionsC = useMemo(() => LISTENING_QUESTIONS.filter((q) => q.section === 'C'), [])

  // Writing countdown
  useEffect(() => {
    if (step !== 'writing_tasks') return
    if (writingSecsLeft <= 0) { handleWritingSubmit(); return }
    const id = setInterval(() => setWritingSecsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, writingSecsLeft])

  const handleListeningAnswer = useCallback((id: string, val: string) => {
    setListeningAnswers((prev) => ({ ...prev, [id]: val }))
  }, [])

  // ── Listening sections ────────────────────────────────────────────────────

  function nextListeningSection(current: ExamStep) {
    const order: ExamStep[] = ['listening_A', 'listening_B', 'listening_C']
    const idx = order.indexOf(current)
    if (idx < order.length - 1) {
      setStep(order[idx + 1])
    } else {
      handleListeningSubmit()
    }
  }

  async function handleListeningSubmit() {
    setStep('listening_submitting')
    const answer_key: Record<string, string> = {}
    LISTENING_QUESTIONS.forEach((q) => { answer_key[q.id] = q.answer })
    const question_meta = LISTENING_QUESTIONS.map((q) => ({ id: q.id, section: q.section }))

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const res = await apiFetch('/api/listening/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ answers: listeningAnswers, answer_key, question_meta }),
      })
      setListeningResult(res as ListeningResult)
      setStep('listening_done')
    } catch {
      setStep('listening_done')
    }
  }

  // ── Writing ───────────────────────────────────────────────────────────────

  function wordCount(text: string) {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  async function handleWritingSubmit() {
    setStep('writing_submitting')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const res = await apiFetch('/api/writing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          task1_prompt: task1Prompt.prompt,
          task1_response: task1Text,
          task1_word_count: wordCount(task1Text),
          task2_topic: task2Prompt.statement,
          task2_response: task2Text,
          task2_word_count: wordCount(task2Text),
        }),
      })
      setWritingResult(res as WritingResult)
      setStep('writing_done')
    } catch {
      setStep('writing_done')
    }
  }

  // ── Speaking upload + poll ────────────────────────────────────────────────

  async function handleSpeakingComplete(blob: Blob, durationSecs: number) {
    setStep('speaking_uploading')
    setProcessStatus('Uploading recording…')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const userId = sessionData.session?.user?.id

      const form = new FormData()
      form.append('video', blob, 'exam_speaking.webm')
      form.append('student_id', userId ?? '')
      form.append('session_mode', 'exam')
      form.append('topic_text', speakingTopic)
      form.append('duration_secs', String(Math.round(durationSecs)))

      const uploadRes = await apiFetch('/api/presentations/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }) as { presentation_id: string }

      const presentationId = uploadRes.presentation_id
      setStep('speaking_processing')
      setProcessStatus('Analysing your speaking…')

      // Poll status
      const MAX_POLLS = 80
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const statusRes = await apiFetch(`/api/presentations/${presentationId}/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }) as { status: string }

        if (statusRes.status === 'complete') {
          const report = await apiFetch(`/api/reports/${presentationId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }) as { band_score: number; wpm_avg: number | null; eye_contact_pct: number | null; advice_cards: { impact: string; text: string }[] }

          setSpeakingResult({
            presentation_id: presentationId,
            band_score: report.band_score ?? 0,
            wpm_avg: report.wpm_avg ?? null,
            eye_contact_pct: report.eye_contact_pct ?? null,
            advice_cards: report.advice_cards ?? [],
          })
          setStep('results')
          return
        }
        if (statusRes.status === 'failed') break
        setProcessStatus(`Analysing… (${i + 1}/${MAX_POLLS})`)
      }

      // Timeout or failure — still show results with what we have
      setStep('results')
    } catch {
      setStep('results')
    }
  }

  // ── Writing timer display ─────────────────────────────────────────────────
  const wMins = Math.floor(writingSecsLeft / 60)
  const wSecs = writingSecsLeft % 60
  const writingTimerStr = `${wMins}:${wSecs.toString().padStart(2, '0')}`
  const writingTimerColor = writingSecsLeft <= 300 ? '#ef4444' : writingSecsLeft <= 900 ? '#f59e0b' : '#22c55e'

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === 'intro') return <ExamIntro onStart={() => setStep('listening_A')} />

  if (step === 'listening_A') {
    return (
      <SectionPlayer
        section="A" questions={questionsA} answers={listeningAnswers}
        onAnswer={handleListeningAnswer} onNext={() => nextListeningSection('listening_A')}
      />
    )
  }
  if (step === 'listening_B') {
    return (
      <SectionPlayer
        section="B" questions={questionsB} answers={listeningAnswers}
        onAnswer={handleListeningAnswer} onNext={() => nextListeningSection('listening_B')}
      />
    )
  }
  if (step === 'listening_C') {
    return (
      <SectionPlayer
        section="C" questions={questionsC} answers={listeningAnswers}
        onAnswer={handleListeningAnswer} onNext={() => nextListeningSection('listening_C')}
      />
    )
  }

  if (step === 'listening_submitting') {
    return <CenteredSpinner label="Grading listening test…" />
  }

  if (step === 'listening_done') {
    return (
      <TransitionScreen
        icon="🎧"
        title="Listening Complete"
        band={listeningResult?.overall_band ?? null}
        message="Well done! Take a short break if needed, then continue to the Writing test."
        nextLabel="Continue to Writing Test →"
        onNext={() => setStep('writing_tasks')}
      />
    )
  }

  if (step === 'writing_tasks') {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-6 flex flex-col gap-6">
        {/* Timer bar */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between rounded-xl border px-4 py-2.5"
          style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(12px)', transition: 'background 0.3s ease' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Writing Test: Part 2 of 3</p>
          <div className="flex items-center gap-2">
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>Time remaining</span>
            <span className="font-mono text-2xl font-bold" style={{ color: writingTimerColor }}>{writingTimerStr}</span>
          </div>
        </div>
        <Task1Panel prompt={task1Prompt} value={task1Text} onChange={setTask1Text} />
        <Task2Panel prompt={task2Prompt} value={task2Text} onChange={setTask2Text} />
        <div className="flex justify-end pb-4">
          <button
            onClick={handleWritingSubmit}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white min-h-[48px]"
            style={{ background: 'var(--accent-teal)' }}
          >
            Submit Writing Test
          </button>
        </div>
      </div>
    )
  }

  if (step === 'writing_submitting') {
    return <CenteredSpinner label="Evaluating your writing with AI…" />
  }

  if (step === 'writing_done') {
    return (
      <TransitionScreen
        icon="✍️"
        title="Writing Complete"
        band={writingResult?.overall_band ?? null}
        message="Great effort! The final part is the Speaking test: 2 minutes preparation, then 2 minutes to speak."
        nextLabel="Continue to Speaking Test →"
        onNext={() => setStep('speaking_prep')}
      />
    )
  }

  if (step === 'speaking_prep') {
    return <SpeakingPrepStep topic={speakingTopic} onReady={() => setStep('speaking_record')} />
  }

  if (step === 'speaking_record') {
    return (
      <RecordingInterface
        topic={speakingTopic}
        mode="exam"
        maxSecs={120}
        onComplete={handleSpeakingComplete}
        onCancel={(action) => {
          if (action === 'restart') setStep('speaking_prep')
          else setStep('speaking_prep')
        }}
      />
    )
  }

  if (step === 'speaking_uploading' || step === 'speaking_processing') {
    return <CenteredSpinner label={processStatus || 'Processing…'} />
  }

  if (step === 'results') {
    return (
      <ExamResults
        listeningResult={listeningResult}
        writingResult={writingResult}
        speakingResult={speakingResult}
      />
    )
  }

  return null
}

// ── Shared micro-components ───────────────────────────────────────────────────

function CenteredSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-teal)', borderTopColor: 'transparent' }} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  )
}

function bandColor(band: number | null) {
  if (band === null) return '#9B8E80'
  if (band >= 5) return '#22c55e'
  if (band >= 4) return '#A8A8A8'
  if (band >= 3) return '#f59e0b'
  return '#ef4444'
}

function TransitionScreen({
  icon, title, band, message, nextLabel, onNext,
}: {
  icon: string
  title: string
  band: number | null
  message: string
  nextLabel: string
  onNext: () => void
}) {
  const color = bandColor(band)
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4">
      <div className="text-5xl">{icon}</div>
      <div className="text-center flex flex-col gap-1">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {band !== null && (
          <p className="text-lg font-semibold" style={{ color }}>
            Band {band.toFixed(1)}
          </p>
        )}
      </div>
      <p className="text-sm max-w-sm text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      <button
        onClick={onNext}
        className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white min-h-[44px]"
        style={{ background: 'var(--accent-teal)' }}
      >
        {nextLabel}
      </button>
    </div>
  )
}
