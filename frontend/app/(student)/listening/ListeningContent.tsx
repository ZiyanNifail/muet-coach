'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import { LISTENING_QUESTIONS } from '@/lib/listeningQuestions'
import { ListeningIntro } from './components/ListeningIntro'
import { SectionPlayer } from './components/SectionPlayer'
import { ListeningResults } from './components/ListeningResults'

type Step = 'intro' | 'section_A' | 'section_B' | 'section_C' | 'submitting' | 'results'

interface SessionResult {
  session_id: string
  section_scores: Record<string, { correct: number; total: number }>
  overall_band: number
  advice_cards: { impact: string; text: string }[]
}

const SECTION_ORDER: Step[] = ['section_A', 'section_B', 'section_C']

export function ListeningContent() {
  const [step, setStep] = useState<Step>('intro')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<SessionResult | null>(null)
  const [error, setError] = useState('')

  const questionsA = LISTENING_QUESTIONS.filter((q) => q.section === 'A')
  const questionsB = LISTENING_QUESTIONS.filter((q) => q.section === 'B')
  const questionsC = LISTENING_QUESTIONS.filter((q) => q.section === 'C')

  const handleAnswer = useCallback((id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }, [])

  function nextSection(current: Step) {
    const idx = SECTION_ORDER.indexOf(current)
    if (idx < SECTION_ORDER.length - 1) {
      setStep(SECTION_ORDER[idx + 1])
    } else {
      handleSubmit()
    }
  }

  async function handleSubmit() {
    setStep('submitting')
    setError('')

    const answer_key: Record<string, string> = {}
    LISTENING_QUESTIONS.forEach((q) => {
      answer_key[q.id] = q.answer
    })

    const question_meta = LISTENING_QUESTIONS.map((q) => ({ id: q.id, section: q.section }))

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await apiFetch('/api/listening/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answers, answer_key, question_meta }),
      })

      setResult(res as SessionResult)
      setStep('results')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
      setStep('section_C')
    }
  }

  function restart() {
    setStep('intro')
    setAnswers({})
    setResult(null)
    setError('')
  }

  if (step === 'intro') return <ListeningIntro onStart={() => setStep('section_A')} />

  if (step === 'section_A') {
    return (
      <SectionPlayer
        key="section_A"
        section="A"
        questions={questionsA}
        answers={answers}
        onAnswer={handleAnswer}
        onNext={() => nextSection('section_A')}
      />
    )
  }

  if (step === 'section_B') {
    return (
      <SectionPlayer
        key="section_B"
        section="B"
        questions={questionsB}
        answers={answers}
        onAnswer={handleAnswer}
        onNext={() => nextSection('section_B')}
      />
    )
  }

  if (step === 'section_C') {
    return (
      <SectionPlayer
        key="section_C"
        section="C"
        questions={questionsC}
        answers={answers}
        onAnswer={handleAnswer}
        onNext={() => nextSection('section_C')}
        error={error}
      />
    )
  }

  if (step === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-teal)', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Evaluating your answers…</p>
      </div>
    )
  }

  if (step === 'results' && result) {
    return (
      <ListeningResults
        result={result}
        answers={answers}
        onRetry={restart}
      />
    )
  }

  return null
}
