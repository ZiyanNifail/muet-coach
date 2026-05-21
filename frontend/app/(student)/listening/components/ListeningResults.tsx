'use client'
import { RotateCcw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LISTENING_QUESTIONS } from '@/lib/listeningQuestions'

interface SectionScore { correct: number; total: number }
interface AdviceCard { impact: string; text: string }
interface SessionResult {
  session_id: string
  section_scores: Record<string, SectionScore>
  overall_band: number
  advice_cards: AdviceCard[]
}

function bandColor(band: number) {
  if (band >= 5) return '#22c55e'
  if (band >= 4) return '#A8A8A8'
  if (band >= 3) return '#f59e0b'
  return '#ef4444'
}

function bandLabel(band: number) {
  if (band >= 5) return 'Band 5–6'
  if (band >= 4) return 'Band 4'
  if (band >= 3) return 'Band 3'
  return 'Band 1–2'
}

const IMPACT_ORDER = ['HIGH', 'MED', 'LOW']
const IMPACT_COLOR: Record<string, string> = {
  HIGH: '#ef4444',
  MED: '#f59e0b',
  LOW: '#22c55e',
}

export function ListeningResults({
  result,
  answers,
  onRetry,
}: {
  result: SessionResult
  answers: Record<string, string>
  onRetry: () => void
}) {
  const { section_scores, overall_band, advice_cards } = result
  const color = bandColor(overall_band)

  const sections = ['A', 'B', 'C'] as const
  const sectionLabel: Record<string, string> = {
    A: 'Section A: Short Dialogues',
    B: 'Section B: Extended Conversation',
    C: 'Section C: Academic Monologue',
  }

  const sortedCards = [...advice_cards].sort(
    (a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)
  )

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Results
          </p>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Listening Test Complete</h2>
        </div>
        <Button variant="secondary" onClick={onRetry}>
          <RotateCcw size={13} className="mr-1.5" />
          Try Again
        </Button>
      </div>

      {/* Overall band */}
      <div
        className="rounded-2xl border p-4 md:p-5 flex items-center gap-4 md:gap-5"
        style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
      >
        <div
          className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0"
          style={{ background: `${color}18`, border: `2px solid ${color}40` }}
        >
          <span className="text-3xl font-bold" style={{ color }}>{overall_band.toFixed(1)}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color }}>Band</span>
        </div>
        <div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{bandLabel(overall_band)}</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Overall score based on {Object.values(section_scores).reduce((a, s) => a + (s.total ?? 0), 0)} questions
          </p>
        </div>
      </div>

      {/* Section breakdown */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Section Breakdown</p>
        {sections.map((sec) => {
          const s = section_scores[sec] ?? { correct: 0, total: 10 }
          const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
          const sColor = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
          const sectionQs = LISTENING_QUESTIONS.filter((q) => q.section === sec)

          return (
            <div
              key={sec}
              className="rounded-xl border p-4 flex flex-col gap-3"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sectionLabel[sec]}</p>
                <span className="text-sm font-bold" style={{ color: sColor }}>
                  {s.correct}/{s.total}
                </span>
              </div>

              <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-surface)' }}>
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%`, background: sColor }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {sectionQs.map((q, i) => {
                  const submitted = (answers[q.id] ?? '').trim().toLowerCase()
                  const correct = q.answer.trim().toLowerCase()
                  const isCorrect = submitted === correct
                  return (
                    <div
                      key={q.id}
                      title={`Q${i + 1}: ${isCorrect ? 'Correct' : `Wrong (${q.answer})`}`}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold cursor-default"
                      style={{
                        background: isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                        color: isCorrect ? '#16a34a' : '#ef4444',
                      }}
                    >
                      {i + 1}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Advice cards */}
      {sortedCards.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: 'var(--accent-teal)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>How to Improve</p>
          </div>
          {sortedCards.map((card, i) => (
            <div
              key={i}
              className="rounded-xl border p-3.5 flex gap-3"
              style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
            >
              <span
                className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 h-fit"
                style={{ background: `${IMPACT_COLOR[card.impact]}18`, color: IMPACT_COLOR[card.impact] }}
              >
                {card.impact}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{card.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
