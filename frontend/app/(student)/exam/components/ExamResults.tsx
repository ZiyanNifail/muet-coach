'use client'
import { GraduationCap, Headphones, PenLine, Mic, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { ListeningResult, WritingResult, SpeakingResult } from '../ExamContent'

interface ExamResultsProps {
  listeningResult: ListeningResult | null
  writingResult: WritingResult | null
  speakingResult: SpeakingResult | null
}

function bandColor(band: number | null) {
  if (band === null) return '#9B8E80'
  if (band >= 5) return '#22c55e'
  if (band >= 4) return '#A8A8A8'
  if (band >= 3) return '#f59e0b'
  return '#ef4444'
}

function bandLabel(band: number | null) {
  if (band === null) return 'N/A'
  if (band >= 5) return 'Band 5–6 · Proficient'
  if (band >= 4) return 'Band 4 · Good'
  if (band >= 3) return 'Band 3 · Adequate'
  return 'Band 1–2 · Limited'
}

const IMPACT_ORDER = ['HIGH', 'MED', 'LOW']
const IMPACT_COLOR: Record<string, string> = { HIGH: '#ef4444', MED: '#f59e0b', LOW: '#22c55e' }

function AdviceList({ cards }: { cards: { impact: string; text: string }[] }) {
  const sorted = [...cards]
    .sort((a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact))
    .slice(0, 3)
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((c, i) => (
        <div key={i} className="flex gap-2.5 items-start">
          <span
            className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5"
            style={{ background: `${IMPACT_COLOR[c.impact]}18`, color: IMPACT_COLOR[c.impact] }}
          >
            {c.impact}
          </span>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{c.text}</p>
        </div>
      ))}
    </div>
  )
}

function SectionCard({
  icon: Icon,
  iconColor,
  number,
  title,
  band,
  sublabel,
  children,
}: {
  icon: React.ElementType
  iconColor: string
  number: string
  title: string
  band: number | null
  sublabel?: string
  children?: React.ReactNode
}) {
  const color = bandColor(band)
  return (
    <div
      className="rounded-2xl border flex flex-col overflow-hidden"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between gap-3"
        style={{ background: `${iconColor}0D` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${iconColor}18` }}
          >
            <Icon size={15} style={{ color: iconColor }} />
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: iconColor, opacity: 0.75 }}>
              {number}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold" style={{ color }}>{band !== null ? band.toFixed(1) : '—'}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Band</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col gap-3" style={{ background: 'var(--bg-panel)', transition: 'background 0.3s ease' }}>
        {sublabel && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sublabel}</p>}
        {children}
      </div>
    </div>
  )
}

export function ExamResults({ listeningResult, writingResult, speakingResult }: ExamResultsProps) {
  const listeningBand = listeningResult?.overall_band ?? null
  const writingBand = writingResult?.overall_band ?? null
  const speakingBand = speakingResult?.band_score ?? null

  const validBands = [listeningBand, writingBand, speakingBand].filter((b): b is number => b !== null)
  const overallBand = validBands.length > 0
    ? Math.round((validBands.reduce((a, b) => a + b, 0) / validBands.length) * 10) / 10
    : null
  const overallColor = bandColor(overallBand)

  const listScores = listeningResult?.section_scores
  const listA = listScores?.A ?? { correct: 0, total: 10 }
  const listB = listScores?.B ?? { correct: 0, total: 10 }
  const listC = listScores?.C ?? { correct: 0, total: 10 }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Title */}
      <div className="text-center flex flex-col gap-1">
        <div className="flex items-center justify-center gap-2">
          <GraduationCap size={18} style={{ color: 'var(--accent-teal)' }} />
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Full Mock Exam Complete
          </p>
        </div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Your Exam Report</h2>
      </div>

      {/* ── Section 1: Listening ── */}
      <SectionCard
        icon={Headphones} iconColor="#3A7D6A"
        number="Section 1" title="Listening"
        band={listeningBand}
        sublabel={`Section A: ${listA.correct}/${listA.total} · Section B: ${listB.correct}/${listB.total} · Section C: ${listC.correct}/${listC.total}`}
      >
        {listeningResult?.advice_cards && listeningResult.advice_cards.length > 0 && (
          <AdviceList cards={listeningResult.advice_cards} />
        )}
        {!listeningResult && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Listening result unavailable.</p>}
      </SectionCard>

      {/* ── Section 2: Writing ── */}
      <SectionCard
        icon={PenLine} iconColor="#7C5CBF"
        number="Section 2" title="Writing"
        band={writingBand}
        sublabel={writingResult ? `Task 1: Band ${writingResult.task1_band.toFixed(1)} · Task 2: Band ${writingResult.task2_band.toFixed(1)}` : undefined}
      >
        {writingResult?.advice_cards && writingResult.advice_cards.length > 0 && (
          <AdviceList cards={writingResult.advice_cards.map((c) => ({ impact: c.impact, text: c.text }))} />
        )}
        {!writingResult && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Writing result unavailable.</p>}
      </SectionCard>

      {/* ── Section 3: Speaking ── */}
      <SectionCard
        icon={Mic} iconColor="#D97706"
        number="Section 3" title="Speaking"
        band={speakingBand}
        sublabel={speakingResult
          ? [
              speakingResult.wpm_avg && `${Math.round(speakingResult.wpm_avg)} WPM`,
              speakingResult.eye_contact_pct != null && `${Math.round(speakingResult.eye_contact_pct)}% eye contact`,
            ].filter(Boolean).join(' · ') || undefined
          : undefined}
      >
        {speakingResult?.advice_cards && speakingResult.advice_cards.length > 0 && (
          <AdviceList cards={speakingResult.advice_cards} />
        )}
        {!speakingResult && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Speaking analysis is still processing or unavailable.</p>
        )}
      </SectionCard>

      {/* ── Section 4: Overall ── */}
      <div
        className="rounded-2xl border p-5 flex flex-col gap-4"
        style={{ background: `${overallColor}08`, borderColor: `${overallColor}30` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: overallColor }} />
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Section 4: Overall Band</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ color: overallColor }}>
              {overallBand !== null ? overallBand.toFixed(1) : '—'}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>avg of {validBands.length} components</p>
          </div>
        </div>

        {/* Band breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Listening', band: listeningBand, color: '#3A7D6A' },
            { label: 'Writing', band: writingBand, color: '#7C5CBF' },
            { label: 'Speaking', band: speakingBand, color: '#D97706' },
          ].map(({ label, band, color }) => (
            <div
              key={label}
              className="rounded-xl p-3 flex flex-col items-center gap-1"
              style={{ background: `${color}10` }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
              <span className="text-xl font-bold" style={{ color: bandColor(band) }}>
                {band !== null ? band.toFixed(1) : '—'}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {bandLabel(overallBand)}. {
            overallBand === null ? 'Some components could not be evaluated.' :
            overallBand >= 5 ? 'Excellent performance across all components. You are well-prepared for MUET.' :
            overallBand >= 4 ? 'Good overall performance. Focus on your weaker sections to reach Band 5.' :
            overallBand >= 3 ? 'Adequate performance. Consistent practice across all three components will raise your band.' :
            'Keep practising. Review the feedback in each section and work on foundational skills.'
          }
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pb-4">
        <Link
          href="/exam"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold border no-underline transition-colors text-center"
          style={{ borderColor: 'var(--border-medium)', color: 'var(--text-secondary)', background: 'var(--bg-base)' }}
        >
          Retake Exam
        </Link>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white no-underline text-center"
          style={{ background: 'var(--accent-teal)' }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
