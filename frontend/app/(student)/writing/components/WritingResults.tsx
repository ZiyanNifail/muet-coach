'use client'
import { RotateCcw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AdviceCard {
  criterion: string
  task: number
  impact: string
  text: string
}
interface WritingResult {
  session_id: string
  task1_band: number
  task2_band: number
  overall_band: number
  advice_cards: AdviceCard[]
}

function bandColor(band: number) {
  if (band >= 5) return '#22c55e'
  if (band >= 4) return '#A8A8A8'
  if (band >= 3) return '#f59e0b'
  return '#ef4444'
}

const IMPACT_ORDER = ['HIGH', 'MED', 'LOW']
const IMPACT_COLOR: Record<string, string> = { HIGH: '#ef4444', MED: '#f59e0b', LOW: '#22c55e' }
const CRITERION_LABEL: Record<string, string> = {
  content: 'Content',
  language: 'Language',
  organisation: 'Organisation',
}

function BandBadge({ label, band }: { label: string; band: number }) {
  const c = bandColor(band)
  return (
    <div
      className="rounded-xl border p-3 md:p-4 flex flex-col items-center gap-1 md:gap-1.5"
      style={{ borderColor: `${c}30`, background: `${c}0D` }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="text-3xl font-bold" style={{ color: c }}>{band.toFixed(1)}</span>
      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Band</span>
    </div>
  )
}

export function WritingResults({
  result,
  onRetry,
}: {
  result: WritingResult
  onRetry: () => void
}) {
  const { task1_band, task2_band, overall_band, advice_cards } = result

  const task1Cards = [...advice_cards]
    .filter((c) => c.task === 1)
    .sort((a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact))
  const task2Cards = [...advice_cards]
    .filter((c) => c.task === 2)
    .sort((a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact))

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Results
          </p>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Writing Test Complete</h2>
        </div>
        <Button variant="secondary" onClick={onRetry}>
          <RotateCcw size={13} className="mr-1.5" />
          Try Again
        </Button>
      </div>

      {/* Band scores */}
      <div className="grid grid-cols-3 gap-3">
        <BandBadge label="Task 1" band={task1_band} />
        <BandBadge label="Task 2" band={task2_band} />
        <BandBadge label="Overall" band={overall_band} />
      </div>

      <p className="text-xs -mt-2 text-center" style={{ color: 'var(--text-tertiary)' }}>
        Overall = Task 1 (33%) + Task 2 (67%) weighted average
      </p>

      {/* Advice by task */}
      {[
        { label: 'Task 1: Data Description', cards: task1Cards },
        { label: 'Task 2: Argumentative Essay', cards: task2Cards },
      ].map(({ label, cards }) => (
        <div key={label} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: 'var(--accent-teal)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}: Feedback</p>
          </div>
          {cards.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No specific feedback for this task.</p>
          )}
          {cards.map((card, i) => (
            <div
              key={i}
              className="rounded-xl border p-3.5 flex gap-3"
              style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
            >
              <div className="flex flex-col gap-1 shrink-0">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: `${IMPACT_COLOR[card.impact]}18`, color: IMPACT_COLOR[card.impact] }}
                >
                  {card.impact}
                </span>
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--accent-teal-dim)', color: 'var(--accent-teal)' }}
                >
                  {CRITERION_LABEL[card.criterion] ?? card.criterion}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{card.text}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
