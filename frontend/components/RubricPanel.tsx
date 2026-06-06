'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem, easings } from '@/lib/motion'
import { toBand, bandDescriptor, nextBandDescriptor } from '@/lib/muetDescriptors'

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
      style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
    >
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          MUET RUBRIC BREAKDOWN
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>5 criteria · tap row to expand</span>
      </div>

      <motion.div className="flex flex-col gap-2" variants={staggerContainer} initial="hidden" animate="visible">
        {CRITERIA.map(({ key, label, color }) => {
          const band = rubricBands[key]
          if (!band) return null
          const pct = Math.max(0, Math.min(100, ((band.score - 1) / 5) * 100))
          const isWeakest = key === lowestKey
          const isOpen = expanded === key
          const sc = scoreColor(band.score)

          return (
            <motion.div
              key={key}
              variants={staggerItem}
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
                  style={{ color: 'var(--text-secondary)', minWidth: isWeakest ? 148 : 168 }}
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
                <span style={{ color: 'var(--text-tertiary)', fontSize: 10, transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                  ▾
                </span>
              </div>

              {/* Justification (expanded) */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="justification"
                    className="px-3 pb-3 text-xs leading-relaxed overflow-hidden"
                    style={{ color: 'var(--text-tertiary)', borderTop: '1px solid rgba(180,165,148,0.15)', paddingTop: 8 }}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: easings.smooth }}
                  >
                    <p>{band.justification}</p>
                    <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600 }}>Band {toBand(band.score)}</span>
                      {` — ${bandDescriptor(band.score)}`}
                    </p>
                    {nextBandDescriptor(band.score) && (
                      <p className="mt-1" style={{ color: 'var(--text-tertiary)', opacity: 0.85 }}>
                        <span style={{ fontWeight: 600 }}>Next: Band {nextBandDescriptor(band.score)!.band}</span>
                        {` — ${nextBandDescriptor(band.score)!.text}`}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </motion.div>

      <p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
        Each criterion scored 1.0–6.0 · Band 4 = Satisfactory · Band 5 = Good · Band 6 = Excellent
      </p>
    </div>
  )
}
