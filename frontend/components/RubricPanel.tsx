'use client'
import { useState } from 'react'

export interface RubricBand {
  score: number
  justification: string
}

export type RubricBands = Record<string, RubricBand>

const CRITERIA: { key: string; label: string; color: string }[] = [
  { key: 'task_fulfilment',            label: 'Task Fulfilment',              color: '#3b82f6' },
  { key: 'coherence_cohesion',         label: 'Coherence & Cohesion',         color: '#8b5cf6' },
  { key: 'lexical_resource',           label: 'Lexical Resource',             color: '#22c55e' },
  { key: 'grammatical_range_accuracy', label: 'Grammatical Range & Accuracy', color: '#06b6d4' },
  { key: 'pronunciation',              label: 'Pronunciation',                color: '#f59e0b' },
]

function scoreColor(score: number): string {
  if (score >= 5.0) return '#22c55e'
  if (score >= 4.0) return '#3b82f6'
  if (score >= 3.0) return '#f59e0b'
  return '#ef4444'
}

export function RubricPanel({ rubricBands }: { rubricBands: RubricBands | null | undefined }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!rubricBands) return null

  const lowestKey = CRITERIA.reduce<string | null>((worst, c) => {
    if (!rubricBands[c.key]) return worst
    if (worst === null) return c.key
    return rubricBands[c.key].score < (rubricBands[worst]?.score ?? 7) ? c.key : worst
  }, null)

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-5"
      style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}
    >
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80' }}>
          MUET RUBRIC BREAKDOWN
        </div>
        <span style={{ fontSize: 10, color: '#C4B8A8' }}>5 criteria · tap row to expand</span>
      </div>

      <div className="flex flex-col gap-2">
        {CRITERIA.map(({ key, label, color }) => {
          const band = rubricBands[key]
          if (!band) return null
          const pct = Math.max(0, Math.min(100, ((band.score - 1) / 5) * 100))
          const isWeakest = key === lowestKey
          const isOpen = expanded === key
          const sc = scoreColor(band.score)

          return (
            <div
              key={key}
              className="flex flex-col rounded-lg border overflow-hidden cursor-pointer"
              style={{
                borderColor: isWeakest ? 'rgba(245,158,11,0.5)' : 'rgba(180,165,148,0.18)',
                background: isWeakest ? 'rgba(245,158,11,0.04)' : 'rgba(180,165,148,0.04)',
                transition: 'border-color 0.15s',
              }}
              onClick={() => setExpanded(isOpen ? null : key)}
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Weakest indicator */}
                {isWeakest && (
                  <span
                    className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}
                  >
                    FOCUS
                  </span>
                )}

                {/* Criterion label */}
                <span
                  className="shrink-0 text-xs font-medium"
                  style={{ color: '#6B6050', minWidth: isWeakest ? 148 : 168 }}
                >
                  {label}
                </span>

                {/* Progress bar */}
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(180,165,148,0.22)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: color, transition: 'width 0.8s ease' }}
                  />
                </div>

                {/* Score */}
                <span className="shrink-0 font-mono text-sm font-bold" style={{ color: sc, minWidth: 28, textAlign: 'right' }}>
                  {band.score.toFixed(1)}
                </span>

                {/* Expand chevron */}
                <span style={{ color: '#C4B8A8', fontSize: 10, transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                  ▾
                </span>
              </div>

              {/* Justification (expanded) */}
              {isOpen && (
                <div
                  className="px-3 pb-3 text-xs leading-relaxed"
                  style={{ color: '#9B8E80', borderTop: '1px solid rgba(180,165,148,0.15)', paddingTop: 8 }}
                >
                  {band.justification}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 10, color: '#C4B8A8' }}>
        Each criterion scored 1.0–6.0 · Band 4 = Satisfactory · Band 5 = Good · Band 6 = Excellent
      </p>
    </div>
  )
}
