'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Briefcase, ChevronDown, ChevronUp, ArrowLeft, RotateCcw } from 'lucide-react'
import { getAuthHeaders } from '@/lib/supabase'
import { staggerContainer, staggerItem } from '@/lib/motion'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const IMPACT_COLORS: Record<string, string> = {
  HIGH: '#ef4444',
  MED: '#f59e0b',
  LOW: '#10b981',
}

const BAND_LABELS: Record<number, string> = {
  1: 'Non-performer',
  2: 'Limited',
  3: 'Modest',
  4: 'Adequate',
  5: 'Good',
  6: 'Excellent',
}

function bandLabel(band: number) {
  return BAND_LABELS[Math.round(band)] || 'N/A'
}

function ScoreRing({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min(score / max, 1)
  const r = 20
  const circ = 2 * Math.PI * r
  return (
    <svg width={54} height={54} viewBox="0 0 54 54">
      <circle cx={27} cy={27} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={5} />
      <circle
        cx={27} cy={27} r={r} fill="none"
        stroke="var(--accent-teal)" strokeWidth={5}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 27 27)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={27} y={32} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text-primary)">
        {score.toFixed(1)}
      </text>
    </svg>
  )
}

export default function InterviewResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_URL}/api/interview/sessions/${sessionId}`, { headers })
        if (!res.ok) throw new Error('Failed to load results')
        const data = await res.json()
        setSession(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-teal)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading your results…</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm" style={{ color: '#ef4444' }}>{error || 'Results not found'}</p>
      </div>
    )
  }

  const qa: any[] = session.questions_answers || []
  const avgScore = qa.length > 0 ? qa.reduce((s, q) => s + (q.score || 0), 0) / qa.length : 0
  const band = session.overall_band || 0
  const roleLabel = (session.job_role || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">

        {/* Header */}
        <motion.div variants={staggerItem} className="flex items-center gap-3">
          <button onClick={() => router.push('/interview')} className="p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors">
            <ArrowLeft size={16} style={{ color: 'var(--text-tertiary)' }} />
          </button>
          <div className="flex items-center gap-2">
            <Briefcase size={18} style={{ color: 'var(--accent-teal)' }} />
            <h1 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Interview Results</h1>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-teal-dim)', color: 'var(--accent-teal)' }}>
              {roleLabel}
            </span>
          </div>
        </motion.div>

        {/* Score card */}
        <motion.div
          variants={staggerItem}
          className="rounded-2xl p-6 border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Overall Band</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold" style={{ color: 'var(--accent-teal)' }}>{band.toFixed(1)}</span>
                <span className="text-sm mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{bandLabel(band)} · avg score {avgScore.toFixed(1)}/10</span>
              </div>
            </div>
          </div>
          {session.overall_feedback && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{session.overall_feedback}</p>
          )}
        </motion.div>

        {/* Advice cards */}
        {session.advice_cards?.length > 0 && (
          <motion.div variants={staggerItem}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Improvement Tips</p>
            <div className="flex flex-col gap-2">
              {session.advice_cards.map((card: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 border"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                >
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0"
                    style={{ background: `${IMPACT_COLORS[card.impact] || '#6b7280'}20`, color: IMPACT_COLORS[card.impact] || 'var(--text-tertiary)' }}
                  >
                    {card.impact}
                  </span>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{card.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Per-question breakdown */}
        {qa.length > 0 && (
          <motion.div variants={staggerItem}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Question Breakdown</p>
            <div className="flex flex-col gap-2">
              {qa.map((item: any, i: number) => {
                const open = openIdx === i
                return (
                  <div
                    key={i}
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
                  >
                    <button
                      onClick={() => setOpenIdx(open ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <ScoreRing score={item.score || 0} />
                        <div>
                          <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Q{i + 1}</p>
                          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)', maxWidth: '380px' }}>{item.question}</p>
                        </div>
                      </div>
                      {open ? <ChevronUp size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} /> : <ChevronDown size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                    </button>
                    {open && (
                      <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="mt-3 mb-2">
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>Your Answer</p>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {item.answer_transcript || '(no transcript)'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>Feedback</p>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{item.feedback}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div variants={staggerItem} className="flex gap-3">
          <button
            onClick={() => router.push('/interview')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm border transition-all hover:bg-[var(--bg-surface)]"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={14} /> Try Another Role
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 rounded-xl py-3 font-semibold text-sm transition-all"
            style={{ background: 'var(--accent-teal)', color: '#fff' }}
          >
            Back to Dashboard
          </button>
        </motion.div>

      </motion.div>
    </div>
  )
}
