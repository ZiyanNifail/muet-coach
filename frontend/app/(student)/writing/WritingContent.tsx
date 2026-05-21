'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import { TASK1_PROMPTS, TASK2_PROMPTS } from '@/lib/writingPrompts'
import { WritingIntro } from './components/WritingIntro'
import { Task1Panel } from './components/Task1Panel'
import { Task2Panel } from './components/Task2Panel'
import { WritingResults } from './components/WritingResults'

type Step = 'intro' | 'tasks' | 'submitting' | 'results'

interface WritingResult {
  session_id: string
  task1_band: number
  task2_band: number
  overall_band: number
  advice_cards: { criterion: string; task: number; impact: string; text: string }[]
}

const TOTAL_SECS = 90 * 60

export function WritingContent() {
  const [step, setStep] = useState<Step>('intro')
  const [task1Text, setTask1Text] = useState('')
  const [task2Text, setTask2Text] = useState('')
  const [secsLeft, setSecsLeft] = useState(TOTAL_SECS)
  const [result, setResult] = useState<WritingResult | null>(null)
  const [error, setError] = useState('')

  const task1Prompt = useMemo(() => TASK1_PROMPTS[Math.floor(Math.random() * TASK1_PROMPTS.length)], [])
  const task2Prompt = useMemo(() => TASK2_PROMPTS[Math.floor(Math.random() * TASK2_PROMPTS.length)], [])

  useEffect(() => {
    if (step !== 'tasks') return
    if (secsLeft <= 0) {
      handleSubmit()
      return
    }
    const id = setInterval(() => setSecsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, secsLeft])

  function wordCount(text: string) {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  async function handleSubmit() {
    setStep('submitting')
    setError('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await apiFetch('/api/writing/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          task1_prompt: task1Prompt.prompt,
          task1_response: task1Text,
          task1_word_count: wordCount(task1Text),
          task2_topic: task2Prompt.statement,
          task2_response: task2Text,
          task2_word_count: wordCount(task2Text),
        }),
      })

      setResult(res as WritingResult)
      setStep('results')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
      setStep('tasks')
    }
  }

  function restart() {
    setStep('intro')
    setTask1Text('')
    setTask2Text('')
    setSecsLeft(TOTAL_SECS)
    setResult(null)
    setError('')
  }

  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`
  const timerColor = secsLeft <= 300 ? '#ef4444' : secsLeft <= 900 ? '#f59e0b' : '#22c55e'

  if (step === 'intro') return <WritingIntro onStart={() => setStep('tasks')} />

  if (step === 'tasks') {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-6 flex flex-col gap-6">
        {/* Timer bar */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between rounded-xl border px-4 py-2.5"
          style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(12px)', transition: 'background 0.3s ease' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Writing Test: 90 Minutes</p>
          <div className="flex items-center gap-2">
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>Time remaining</span>
            <span className="font-mono text-2xl font-bold" style={{ color: timerColor }}>{timerStr}</span>
          </div>
        </div>

        <Task1Panel
          prompt={task1Prompt}
          value={task1Text}
          onChange={setTask1Text}
        />

        <Task2Panel
          prompt={task2Prompt}
          value={task2Text}
          onChange={setTask2Text}
        />

        {error && (
          <p className="text-xs text-center" style={{ color: 'var(--accent-red)' }}>{error}</p>
        )}

        <div className="flex justify-end pb-4">
          <button
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity min-h-[48px]"
            style={{ background: 'var(--accent-teal)' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Submit Writing Test
          </button>
        </div>
      </div>
    )
  }

  if (step === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-teal)', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Evaluating your writing with AI…</p>
      </div>
    )
  }

  if (step === 'results' && result) {
    return <WritingResults result={result} onRetry={restart} />
  }

  return null
}
