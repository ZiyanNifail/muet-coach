'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, Clock, Download, Lock, WifiOff } from 'lucide-react'
import { getAuthHeaders, supabase } from '@/lib/supabase'
import { TranscriptViewer } from '@/components/TranscriptViewer'
import { VideoPlayer } from '@/components/VideoPlayer'
import { LearningPathPanel } from '@/components/LearningPathPanel'
import { RubricPanel, type RubricBands } from '@/components/RubricPanel'
import { ModelAnswerCard } from '@/components/ModelAnswerCard'
import { staggerContainer, staggerItem, easings } from '@/lib/motion'

interface Report {
  id: string
  presentation_id: string
  band_score: number | null
  wpm_avg: number | null
  filler_count: number | null
  filler_density: number | null
  eye_contact_pct: number | null
  posture_score: number | null
  transcript: string | null
  pace_timeseries: { time_sec: number; wpm: number }[] | null
  advice_cards: { impact: 'HIGH' | 'MED' | 'LOW'; text: string }[] | null
  confidence_flags: { audio_ok: boolean; face_ok: boolean; pose_ok: boolean } | null
  topic_text: string | null
  session_mode: string | null
  duration_secs: number | null
  pitch_mean_hz: number | null
  energy_mean_db: number | null
  sentiment_score: number | null
  voice_clarity_score: number | null
  confidence_score: number | null
  eye_contact_timeline: { t: number; value: number }[] | null
  rubric_bands: RubricBands | null
}

const DEMO_REPORT: Report = {
  id: 'demo',
  presentation_id: 'demo',
  band_score: 4.5,
  wpm_avg: 142,
  filler_count: 3,
  filler_density: 1.3,
  eye_contact_pct: 68,
  posture_score: 74,
  transcript:
    'The education system in [um] Malaysia has evolved significantly over the past decade, with increasing emphasis on digital literacy and critical thinking skills. However, access to quality education remains unequal across urban and rural areas...',
  pace_timeseries: [
    { time_sec: 0, wpm: 128 },
    { time_sec: 60, wpm: 155 },
    { time_sec: 120, wpm: 142 },
    { time_sec: 180, wpm: 138 },
    { time_sec: 240, wpm: 161 },
  ],
  advice_cards: [
    { impact: 'HIGH', text: "Reduce filler words: 'um' detected 3 times. Pause briefly instead." },
    { impact: 'MED', text: 'Maintain eye contact above 70%. Look directly at the camera.' },
    { impact: 'MED', text: 'Expand vocabulary. Use more domain-specific terminology.' },
    { impact: 'LOW', text: 'Use discourse markers (firstly, furthermore) to structure your talk.' },
    { impact: 'LOW', text: 'Vary sentence length. Mix short statements with longer explanations.' },
  ],
  confidence_flags: { audio_ok: true, face_ok: true, pose_ok: true },
  topic_text: 'Education in Malaysia',
  session_mode: 'guided',
  duration_secs: 120,
  pitch_mean_hz: 182,
  energy_mean_db: -24.3,
  sentiment_score: 0.71,
  voice_clarity_score: 78,
  confidence_score: 73.2,
  rubric_bands: {
    task_fulfilment:            { score: 4.5, justification: 'Addresses the topic with adequate content and idea development.' },
    coherence_cohesion:         { score: 4.0, justification: 'Generally organised; could use more discourse markers for smoother flow.' },
    lexical_resource:           { score: 3.5, justification: 'Adequate vocabulary range with some repetition of basic words.' },
    grammatical_range_accuracy: { score: 4.0, justification: 'Generally accurate grammar with occasional errors in complex structures.' },
    pronunciation:              { score: 4.5, justification: 'Clear articulation with natural rhythm and good vocal energy.' },
  },
  eye_contact_timeline: [
    { t: 0, value: 82 },
    { t: 10, value: 45 },
    { t: 20, value: 71 },
    { t: 30, value: 28 },
    { t: 40, value: 68 },
    { t: 50, value: 90 },
    { t: 60, value: 55 },
    { t: 70, value: 33 },
    { t: 80, value: 74 },
    { t: 90, value: 88 },
    { t: 100, value: 62 },
    { t: 110, value: 41 },
  ],
}

interface PrevMetrics {
  band_score: number | null
  wpm_avg: number | null
  filler_count: number | null
  eye_contact_pct: number | null
  presentation_id?: string
}

function parseFillerBreakdown(transcript: string | null): Array<[string, number]> {
  if (!transcript) return []
  const matches = transcript.match(/\[([^\]]+)\]/g) || []
  const counts: Record<string, number> = {}
  for (const m of matches) {
    const word = m.slice(1, -1).toLowerCase().trim()
    if (word) counts[word] = (counts[word] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
}

function DeltaChip({ delta, improved, neutral }: { delta: string; improved: boolean; neutral?: boolean }) {
  if (neutral) return <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>= {delta}</span>
  return (
    <span
      className="inline-flex items-center gap-0.5 font-mono font-bold"
      style={{
        fontSize: 10,
        color: improved ? '#4ade80' : '#f87171',
        background: improved ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
        padding: '1px 5px',
        borderRadius: 4,
      }}
    >
      {improved ? '↑' : '↓'} {delta}
    </span>
  )
}

function ComparisonPanel({ current, prev }: { current: Report; prev: PrevMetrics }) {
  type Metric = {
    label: string
    curr: number | null
    prevVal: number | null
    format: (v: number) => string
    isImproved: (c: number, p: number) => boolean | 'neutral'
  }
  const metrics: Metric[] = [
    {
      label: 'BAND',
      curr: current.band_score,
      prevVal: prev.band_score,
      format: v => v.toFixed(1),
      isImproved: (c, p) => Math.abs(c - p) < 0.05 ? 'neutral' : c > p,
    },
    {
      label: 'WPM',
      curr: current.wpm_avg,
      prevVal: prev.wpm_avg,
      format: v => String(Math.round(Math.abs(v))),
      isImproved: (c, p) => {
        const dist = (v: number) => v < 130 ? 130 - v : v > 150 ? v - 150 : 0
        if (Math.abs(c - p) < 1) return 'neutral'
        return dist(c) < dist(p)
      },
    },
    {
      label: 'FILLERS',
      curr: current.filler_count,
      prevVal: prev.filler_count,
      format: v => String(Math.abs(Math.round(v))),
      isImproved: (c, p) => Math.abs(c - p) < 1 ? 'neutral' : c < p,
    },
    {
      label: 'EYE CONTACT',
      curr: current.eye_contact_pct,
      prevVal: prev.eye_contact_pct,
      format: v => `${Math.abs(Math.round(v))}%`,
      isImproved: (c, p) => Math.abs(c - p) < 1 ? 'neutral' : c > p,
    },
  ]
  const available = metrics.filter(m => m.curr != null && m.prevVal != null)
  if (available.length === 0) return null
  return (
    <motion.div
      className="flex flex-col gap-3 rounded-xl border p-5"
      style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        VS LAST SESSION
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {available.map(({ label, curr, prevVal, format, isImproved }) => {
          const delta = curr! - prevVal!
          const status = isImproved(curr!, prevVal!)
          const isNeutral = status === 'neutral'
          const improved = status === true
          return (
            <div
              key={label}
              className="flex flex-col gap-1.5 rounded-lg border p-3"
              style={{
                background: isNeutral ? 'rgba(180,165,148,0.06)' : improved ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
                borderColor: isNeutral ? 'rgba(180,165,148,0.18)' : improved ? 'rgba(34,197,94,0.20)' : 'rgba(239,68,68,0.20)',
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                {label}
              </span>
              <span className="font-mono text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {format(curr!)}
              </span>
              <DeltaChip delta={format(Math.abs(delta))} improved={improved} neutral={isNeutral} />
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>was {format(prevVal!)}</span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

const IMPACT_VARIANT = { HIGH: 'red', MED: 'amber', LOW: 'blue' } as const
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function postureLabel(score: number | null): string {
  if (score === null) return 'N/A'
  if (score >= 70) return 'Good'
  if (score >= 40) return 'Needs Work'
  return 'Poor'
}

function bandDescriptor(score: number): string {
  if (score >= 5.5) return 'Very Proficient'
  if (score >= 4.5) return 'Proficient'
  if (score >= 3.5) return 'High Intermediate'
  if (score >= 2.5) return 'Intermediate'
  if (score >= 1.5) return 'Limited'
  return 'Minimal'
}

function bandColor(score: number): string {
  if (score >= 5) return '#22c55e'
  if (score >= 3.5) return '#94a3b8'
  if (score >= 2.5) return '#f59e0b'
  return '#ef4444'
}

// SVG circular band ring
function BandRing({ score }: { score: number }) {
  const R = 52
  const C = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(1, (score - 1) / 5))
  const dash = pct * C
  const color = bandColor(score)

  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx={70} cy={70} r={R} fill="none" stroke="rgba(180,165,148,0.22)" strokeWidth={10} />
      <motion.circle
        cx={70} cy={70} r={R} fill="none"
        stroke={color} strokeWidth={10}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        initial={{ strokeDasharray: `0 ${C}` }}
        animate={{ strokeDasharray: `${dash} ${C}` }}
        transition={{ duration: 1.4, ease: easings.smooth, delay: 0.15 }}
      />
      <text x={70} y={65} textAnchor="middle" fill={color}
        fontSize={28} fontWeight={700} fontFamily="monospace">
        {score.toFixed(1)}
      </text>
      <text x={70} y={83} textAnchor="middle" fill="var(--text-tertiary)" fontSize={9} letterSpacing="0.1em">
        BAND
      </text>
      <text x={70} y={97} textAnchor="middle" fill="var(--text-tertiary)" fontSize={9}>
        {bandDescriptor(score)}
      </text>
    </svg>
  )
}

// Posture progress bar
function PostureBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score))
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-[var(--text-secondary)]">Posture Score</span>
          <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Delivery indicator · not part of MUET language band</span>
        </div>
        <span className="text-xs font-mono font-semibold" style={{ color }}>
          {Math.round(pct)}/100 · {postureLabel(score)}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(180,165,148,0.22)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: easings.smooth, delay: 0.3 }}
        />
      </div>
    </div>
  )
}

// PDF export via browser print
function printReport(r: Report) {
  const color = r.band_score ? bandColor(r.band_score) : '#6b7280'
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Feedback Report | fluency.my</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:0 auto;padding:40px 32px;color:#111;background:#fff}
  h1{font-size:22px;font-weight:700;margin-bottom:4px}
  .sub{color:#6b7280;font-size:12px;margin-bottom:28px}
  .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
  .metric{border:1px solid #e5e7eb;border-radius:8px;padding:14px}
  .mlabel{font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af}
  .mval{font-size:24px;font-weight:700;margin-top:4px;font-family:monospace}
  .msub{font-size:11px;color:#9ca3af;margin-top:2px}
  .section{margin-bottom:22px}
  .stitle{font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #f3f4f6}
  .card{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:6px;font-size:13px;line-height:1.5}
  .impact{font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;white-space:nowrap;margin-top:1px}
  .iH{background:#fee2e2;color:#dc2626}
  .iM{background:#fef3c7;color:#d97706}
  .iL{background:#e2e8f0;color:#475569}
  .transcript{background:#f9fafb;border-radius:8px;padding:14px;font-size:13px;line-height:1.9;color:#374151}
  .filler{background:#fee2e2;color:#dc2626;border-radius:3px;padding:0 3px}
  .posture-bar-bg{background:#f3f4f6;border-radius:9999px;height:8px;overflow:hidden;margin-top:6px}
  .posture-bar-fill{height:100%;border-radius:9999px}
  .posture-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-bottom:4px}
  .footer{margin-top:36px;padding-top:16px;border-top:1px solid #f3f4f6;font-size:10px;color:#9ca3af;text-align:center}
  @media print{body{padding:0 20px}@page{margin:20mm 15mm}}
</style>
</head>
<body>
<h1>Presentation Feedback Report</h1>
<p class="sub">Generated by fluency.my &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-MY', { dateStyle: 'long' })}</p>

<div class="metrics">
  <div class="metric">
    <div class="mlabel">Band Score</div>
    <div class="mval" style="color:${color}">${r.band_score?.toFixed(1) ?? '—'}</div>
    <div class="msub">${r.band_score ? bandDescriptor(r.band_score) : ''}</div>
  </div>
  <div class="metric">
    <div class="mlabel">Avg WPM</div>
    <div class="mval" style="color:#64748b">${r.wpm_avg ? Math.round(r.wpm_avg) : '—'}</div>
    <div class="msub">Target: 130–150</div>
  </div>
  <div class="metric">
    <div class="mlabel">Eye Contact</div>
    <div class="mval" style="color:#059669">${r.eye_contact_pct != null ? Math.round(r.eye_contact_pct) + '%' : '—'}</div>
    <div class="msub">Target: ≥70%</div>
  </div>
  <div class="metric">
    <div class="mlabel">Posture</div>
    <div class="mval" style="color:#d97706">${r.posture_score != null ? Math.round(r.posture_score) : '—'}</div>
    <div class="msub">${postureLabel(r.posture_score)} · /100</div>
  </div>
</div>

${r.posture_score != null ? `
<div class="section">
  <div class="stitle">Posture Breakdown</div>
  <div class="posture-row">
    <span>Overall posture score</span>
    <strong>${Math.round(r.posture_score)}/100: ${postureLabel(r.posture_score)}</strong>
  </div>
  <div class="posture-bar-bg">
    <div class="posture-bar-fill" style="width:${r.posture_score}%;background:${r.posture_score >= 80 ? '#16a34a' : r.posture_score >= 60 ? '#2563eb' : r.posture_score >= 40 ? '#d97706' : '#dc2626'}"></div>
  </div>
</div>` : ''}

${r.filler_count != null ? `
<div class="section">
  <div class="stitle">Speech Metrics</div>
  <div style="font-size:13px;color:#374151">
    <strong>${r.filler_count}</strong> filler word${r.filler_count !== 1 ? 's' : ''} detected
    ${r.filler_density != null ? ` &nbsp;·&nbsp; <strong>${r.filler_density.toFixed(1)}</strong>/min` : ''}
    ${r.wpm_avg != null ? ` &nbsp;·&nbsp; Average pace <strong>${Math.round(r.wpm_avg)} WPM</strong>` : ''}
  </div>
</div>` : ''}

${r.advice_cards && r.advice_cards.length > 0 ? `
<div class="section">
  <div class="stitle">Insights &amp; Recommendations (${r.advice_cards.length})</div>
  ${r.advice_cards.map(c => `
  <div class="card">
    <span style="color:#9ca3af;margin-top:1px">▸</span>
    <span style="flex:1">${c.text}</span>
    <span class="impact i${c.impact[0]}">${c.impact}</span>
  </div>`).join('')}
</div>` : ''}

${r.transcript ? `
<div class="section">
  <div class="stitle">Transcript</div>
  <div class="transcript">${r.transcript.replace(/\[([^\]]+)\]/g, '<span class="filler">$1</span>')}</div>
</div>` : ''}

<div class="footer">
  fluency.my &nbsp;·&nbsp; AI-Powered MUET Speaking Coach &nbsp;·&nbsp; Management and Science University FYP 2025
</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=950,height=750')
  if (!win) { alert('Please allow pop-ups to export PDF.'); return }
  win.document.write(html)
  win.document.close()
  win.addEventListener('load', () => win.print())
}

// Threshold definitions for each sub-metric tooltip
const METRIC_THRESHOLDS = {
  'VOICE CLARITY': {
    target: '≥ 75%',
    description: 'Estimated from Whisper transcription confidence. May underestimate speakers with non-native accents — use as a guide alongside the Pronunciation rubric score.',
    check: (v: number) => v >= 75,
    goodLabel: 'Meets target',
    badLabel: 'Below target. Work on clear enunciation and microphone placement.',
  },
  'SENTIMENT': {
    target: '≥ 60%',
    description: 'Positive, confident delivery tone. Higher % = more engaging and enthusiastic.',
    check: (v: number) => v >= 60,
    goodLabel: 'Positive delivery',
    badLabel: 'Tone sounds hesitant or flat. Project more confidence.',
  },
  'PITCH': {
    target: '100 – 220 Hz',
    description: 'Natural speaking pitch range. Outside this range may sound monotone or strained.',
    check: (v: number) => v >= 100 && v <= 220,
    goodLabel: 'Natural range',
    badLabel: 'Outside natural range. Vary your vocal pitch.',
  },
  'ENERGY': {
    target: '-30 to -15 dB',
    description: 'Vocal loudness/projection. Too quiet (<-35 dB) or too loud (>-10 dB) is penalised.',
    check: (v: number) => v >= -30 && v <= -15,
    goodLabel: 'Good projection',
    badLabel: 'Adjust volume. Speak more clearly into the microphone.',
  },
}

function ConfidenceCard({ score, sentiment, clarity, pitch, energy }: {
  score: number
  sentiment: number | null
  clarity: number | null
  pitch: number | null
  energy: number | null
}) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#94a3b8' : score >= 35 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Strong' : score >= 50 ? 'Developing' : score >= 35 ? 'Needs Work' : 'Weak'
  const pct = Math.max(0, Math.min(100, score))

  const metrics = [
    { key: 'VOICE CLARITY', value: clarity != null ? `${Math.round(clarity)}%` : '—', raw: clarity, color: '#8b5cf6' },
    { key: 'SENTIMENT',     value: sentiment != null ? `${Math.round(sentiment * 100)}%` : '—', raw: sentiment != null ? sentiment * 100 : null, color: '#06b6d4' },
    { key: 'PITCH',         value: pitch != null ? `${Math.round(pitch)} Hz` : '—', raw: pitch, color: '#f59e0b' },
    { key: 'ENERGY',        value: energy != null ? `${energy.toFixed(1)} dB` : '—', raw: energy, color: '#f97316' },
  ]

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-5"
      style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        AI CONFIDENCE SCORE
      </div>

      {/* Main score bar */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="font-mono text-3xl font-bold" style={{ color }}>{score.toFixed(1)}</span>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>/100 · {label}</span>
        </div>
        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(180,165,148,0.22)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: easings.smooth, delay: 0.4 }}
          />
        </div>
      </div>

      {/* Sub-metrics row — hover for threshold tooltip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((m) => {
          const thresh = METRIC_THRESHOLDS[m.key as keyof typeof METRIC_THRESHOLDS]
          const met = m.raw != null ? thresh.check(m.raw) : null
          const isHovered = hoveredMetric === m.key
          return (
            <div
              key={m.key}
              className="relative flex flex-col gap-0.5 rounded-lg border p-2.5 cursor-default"
              style={{
                background: isHovered ? 'rgba(180,165,148,0.22)' : 'rgba(180,165,148,0.06)',
                borderColor: isHovered ? `${m.color}44` : 'rgba(255,255,255,0.05)',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={() => setHoveredMetric(m.key)}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                {m.key}
              </span>
              <span className="font-mono text-sm font-semibold" style={{ color: m.color }}>
                {m.value}
              </span>
              {/* Status dot — green if met, amber if not, nothing if no data */}
              {met !== null && (
                <span
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                  style={{ background: met ? '#22c55e' : '#f59e0b' }}
                />
              )}

              {/* Hover tooltip */}
              {isHovered && (
                <div
                  className="absolute z-30 bottom-full left-0 mb-2 w-52 rounded-lg border p-3 flex flex-col gap-1.5"
                  style={{
                    background: 'rgba(12,10,20,0.97)',
                    borderColor: `${m.color}44`,
                    boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px ${m.color}22`,
                  }}
                >
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: m.color }}>
                    {m.key}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {thresh.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Target:</span>
                    <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{thresh.target}</span>
                  </div>
                  {met !== null && (
                    <div
                      className="flex items-center gap-1.5 rounded px-2 py-1"
                      style={{ background: met ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${met ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: met ? '#22c55e' : '#f59e0b' }} />
                      <span style={{ fontSize: 10, color: met ? '#4ade80' : '#fbbf24' }}>
                        {met ? thresh.goodLabel : thresh.badLabel}
                      </span>
                    </div>
                  )}
                  {m.raw == null && (
                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>No data recorded for this metric.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface EducatorGrade {
  band: number
  percent: number | null
  letter: string | null
  feedback: string
  accuracy_score: number | null
  accuracy_notes: string | null
}

export default function ResultsPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? 'demo'
  const isDemo = id === 'demo'

  const [report, setReport] = useState<Report | null>(isDemo ? DEMO_REPORT : null)
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'network' | 'auth' | 'pipeline' | 'timeout' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [educatorGrade, setEducatorGrade] = useState<EducatorGrade | null>(null)
  const [examLocked, setExamLocked] = useState(false)
  const [prevMetrics, setPrevMetrics] = useState<PrevMetrics | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id)
    })
  }, [])

  // Fetch released educator grade if one exists for this submission
  useEffect(() => {
    if (isDemo) return
    async function fetchGrade() {
      try {
        const authHdr = await getAuthHeaders()
        const res = await fetch(`${API_URL}/api/submissions/${id}`, { headers: authHdr })
        if (!res.ok) return
        const data = await res.json()
        const isExam = data.submission?.session_mode === 'exam'
        if (!data.grade_released) {
          if (isExam) setExamLocked(true)
          return
        }
        const overrides = data.submission?.educator_overrides ?? []
        const latest = Array.isArray(overrides) ? overrides[0] : overrides
        if (!latest) return
        setExamLocked(false)
        setEducatorGrade({
          band: latest.override_band,
          percent: latest.grade_percent ?? null,
          letter: latest.grade_letter ?? null,
          feedback: latest.feedback ?? '',
          accuracy_score: latest.presentation_accuracy_score ?? null,
          accuracy_notes: latest.presentation_accuracy_notes ?? null,
        })
      } catch {}
    }
    fetchGrade()
  }, [id, isDemo])

  // Fetch previous session metrics for comparison panel
  useEffect(() => {
    if (isDemo || !userId || !report) return
    async function fetchPrevious() {
      try {
        const authHdr = await getAuthHeaders()
        const res = await fetch(`${API_URL}/api/reports/history/${userId}`, { headers: authHdr })
        if (!res.ok) return
        const { sessions } = await res.json()
        const prev = (sessions as Array<{ feedback_reports?: PrevMetrics }>).find(
          s => s.feedback_reports?.presentation_id !== report!.presentation_id &&
               s.feedback_reports?.band_score != null
        )
        if (prev?.feedback_reports) setPrevMetrics(prev.feedback_reports)
      } catch {}
    }
    fetchPrevious()
  }, [userId, report, isDemo])

  useEffect(() => {
    if (isDemo) return
    let cancelled = false
    let attempts = 0
    let authHeaders: Record<string, string> = {}

    async function poll() {
      try {
        // Try to fetch the stored report first — works for both new and previous sessions.
        // The report endpoint accepts both presentation_id and report_id (feedback_reports.id).
        const res = await fetch(`${API_URL}/api/reports/${id}`, { headers: authHeaders })

        if (res.status === 401 || res.status === 403) {
          if (!cancelled) {
            setErrorType('auth')
            setError('Your session has expired. Please log in again to view this report.')
            setLoading(false)
          }
          return
        }
        if (res.status === 422) {
          const body = await res.json().catch(() => ({}))
          if (!cancelled) {
            setErrorType('pipeline')
            setError(body.detail || 'Analysis pipeline failed. Please try a new session.')
            setLoading(false)
          }
          return
        }
        if (res.ok) {
          // Report exists in DB — show it immediately, no re-analysis needed
          const data: Report = await res.json()
          if (!cancelled) { setReport(data); setLoading(false) }
          return
        }

        // Report not in DB yet — session is still being processed.
        // Check pipeline status to distinguish "running" from "failed".
        const statusRes = await fetch(`${API_URL}/api/presentations/${id}/status`, { headers: authHeaders })
        if (!cancelled && statusRes.ok) {
          const { status } = await statusRes.json()
          if (status === 'failed') {
            setErrorType('pipeline')
            setError('Analysis pipeline failed. Please try uploading again.')
            setLoading(false)
            return
          }
        }

        // Still processing — keep polling with progressive backoff
        attempts++
        if (attempts >= 60) {
          if (!cancelled) {
            setErrorType('timeout')
            setError('Analysis did not complete. The AI pipeline may have encountered an error. Please try a new session.')
            setLoading(false)
          }
          return
        }
        const delay = attempts > 20 ? 6000 : 3000
        if (!cancelled) setTimeout(poll, delay)
      } catch (err) {
        if (!cancelled) {
          setErrorType('network')
          setError(`Could not load report: ${err instanceof Error ? err.message : 'Network error'}`)
          setLoading(false)
        }
      }
    }

    async function init() {
      try {
        authHeaders = await getAuthHeaders()
      } catch {}
      if (!cancelled) poll()
    }

    init()
    return () => { cancelled = true }
  }, [id, isDemo])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="max-w-sm w-full flex flex-col items-center gap-5 rounded-xl border p-8 text-center"
          style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
        >
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--accent-teal)', boxShadow: '0 0 8px var(--accent-teal)',
              animation: 'pulse 2s ease-in-out infinite', display: 'inline-block',
            }}
          />
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Analysing your session…</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The AI is transcribing your speech, measuring delivery, and generating personalised feedback.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 w-full">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>This usually takes 1–3 minutes.</p>
            <Link href="/dashboard">
              <Button variant="ghost" className="min-h-[44px]">Explore other features →</Button>
            </Link>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Come back to this page — or check History — when it's done.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !report) {
    const iconMap = { network: WifiOff, auth: Lock, pipeline: AlertTriangle, timeout: Clock }
    const ErrorIcon = (errorType && iconMap[errorType]) || AlertTriangle
    const iconColor = errorType === 'auth' ? '#f59e0b' : '#ef4444'
    const borderColor = errorType === 'auth' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'
    const titles = {
      network: 'No connection',
      auth: 'Session expired',
      pipeline: 'Analysis failed',
      timeout: 'Analysis timed out',
    }
    const hints = {
      network: 'Check your internet connection and try again. The server may also be temporarily down.',
      auth: 'Your login session has expired. Please sign in again to view this report.',
      pipeline: 'The AI could not process your recording. This can happen with very short clips or poor audio quality. Try recording a new session.',
      timeout: 'The AI pipeline took longer than expected. Try refreshing — your report may already be ready.',
    }
    const errorTitle = errorType ? titles[errorType] : 'Report unavailable'
    const errorHint = errorType ? hints[errorType] : error

    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="max-w-md w-full flex flex-col items-center gap-5 rounded-xl border p-8 text-center"
          style={{ background: 'var(--bg-panel)', borderColor }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${iconColor}14`, border: `1px solid ${iconColor}33` }}>
            <ErrorIcon size={20} style={{ color: iconColor }} />
          </div>
          <div className="flex flex-col gap-2">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: iconColor }}>
              {errorTitle}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {errorHint}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {(errorType === 'network' || errorType === 'timeout') && (
              <Button onClick={() => window.location.reload()} className="min-h-[44px]">
                {errorType === 'timeout' ? 'Refresh' : 'Try Again'}
              </Button>
            )}
            {errorType === 'auth' && (
              <Link href="/login"><Button className="min-h-[44px]">Log In Again</Button></Link>
            )}
            {(errorType === 'pipeline' || errorType === null) && (
              <Link href="/practice"><Button variant="secondary" className="min-h-[44px]">New Session</Button></Link>
            )}
            <Link href="/dashboard"><Button variant="ghost" className="min-h-[44px]">Dashboard</Button></Link>
          </div>
        </div>
      </div>
    )
  }

  if (!report) return null

  const r = report
  const fillerBreakdown = parseFillerBreakdown(r.transcript)
  const fillerSub = fillerBreakdown.length > 0
    ? fillerBreakdown.map(([w, n]) => `${w}×${n}`).join(' · ')
    : r.filler_density != null ? `${r.filler_density.toFixed(1)}/min` : ''

  const chartData = (() => {
    if (!r.pace_timeseries || r.pace_timeseries.length < 2) return null
    const mapped = r.pace_timeseries.map((p) => ({
      t: p.time_sec < 60 ? `${p.time_sec}s` : `${Math.round(p.time_sec / 60)}m`,
      wpm: Math.round(p.wpm),
    }))
    const allSame = mapped.every((p) => p.wpm === mapped[0].wpm)
    return allSame ? null : mapped
  })()

  return (
    <motion.div
      className="p-4 md:p-6 flex flex-col gap-6 w-full min-w-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easings.smooth }}
    >
      {/* Exam locked state — results hidden until educator finalizes */}
      {examLocked && !educatorGrade && (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center"
          style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.20)' }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.12)' }}>
            <Download size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 6 }}>
              EXAM RESULTS PENDING
            </div>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm">
              Your exam has been submitted and is being reviewed by your educator. Results will be visible once your educator finalizes the marks.
            </p>
          </div>
        </div>
      )}

      {/* Educator grade panel — shown only when grade has been released */}
      {educatorGrade && (
        <div
          className="flex flex-col gap-3 rounded-xl border p-5"
          style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.25)' }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b5cf6' }}>
            EDUCATOR GRADE
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col">
              <span className="font-mono text-3xl font-bold" style={{ color: '#8b5cf6' }}>
                {educatorGrade.band.toFixed(1)}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">MUET Band</span>
            </div>
            {educatorGrade.percent != null && (
              <div className="flex flex-col">
                <span className="font-mono text-3xl font-bold" style={{ color: '#6d28d9' }}>
                  {educatorGrade.percent}%
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  University Grade{educatorGrade.letter ? ` · ${educatorGrade.letter}` : ''}
                </span>
              </div>
            )}
          </div>
          {educatorGrade.feedback && (
            <p className="text-sm text-[var(--text-secondary)] leading-6 border-t pt-3"
              style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
              {educatorGrade.feedback}
            </p>
          )}
          {educatorGrade.accuracy_score != null && (
            <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#22c55e' }}>
                PRESENTATION ACCURACY
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-bold" style={{
                  color: educatorGrade.accuracy_score >= 70 ? '#22c55e' : educatorGrade.accuracy_score >= 50 ? '#f59e0b' : '#ef4444'
                }}>
                  {educatorGrade.accuracy_score.toFixed(0)}%
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">Factual accuracy of content</span>
              </div>
              {educatorGrade.accuracy_notes && (
                <p className="text-xs text-[var(--text-secondary)] leading-5">{educatorGrade.accuracy_notes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full report — hidden for exam submissions until educator releases marks */}
      {(!examLocked || !!educatorGrade) && <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <div
            style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4,
            }}
          >
            FEEDBACK REPORT{isDemo && ' · DEMO DATA'}
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Presentation Analysis</h1>
          {(r.topic_text || r.session_mode) && (
            <p className="text-[var(--text-tertiary)] text-xs mt-1">
              {r.topic_text && <span>{r.topic_text}</span>}
              {r.session_mode && (
                <span className="ml-2 capitalize">{r.session_mode.replace('_', ' ')} session</span>
              )}
              {r.duration_secs != null && (
                <span className="ml-2">
                  · {Math.floor(r.duration_secs / 60)}:{String(Math.round(r.duration_secs % 60)).padStart(2, '0')}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" className="min-h-[44px]" onClick={() => printReport(r)}>
            <Download size={14} className="mr-1.5" />
            Export PDF
          </Button>
          <Badge variant="green">COMPLETED</Badge>
        </div>
      </div>

      {/* Confidence flags */}
      {r.confidence_flags && !isDemo && (
        <div className="flex gap-2 flex-wrap">
          {!r.confidence_flags.audio_ok && <Badge variant="amber">Audio not detected</Badge>}
          {!r.confidence_flags.face_ok && <Badge variant="amber">Face not detected</Badge>}
          {!r.confidence_flags.pose_ok && <Badge variant="amber">Pose not detected</Badge>}
        </div>
      )}

      {/* Band ring + metrics */}
      <div
        className="flex flex-col md:flex-row gap-5 rounded-xl border p-5"
        style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
      >
        {/* Band ring */}
        {r.band_score != null && (
          <div className="shrink-0 flex justify-center md:justify-start">
            <BandRing score={r.band_score} />
          </div>
        )}

        {/* Metric grid */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'AVG WPM', value: r.wpm_avg != null ? String(Math.round(r.wpm_avg)) : '—', color: '#94a3b8', sub: 'Target 130–150' },
              { label: 'EYE CONTACT', value: r.eye_contact_pct != null ? `${Math.round(r.eye_contact_pct)}%` : '—', color: '#22c55e', sub: 'Target ≥70%' },
              { label: 'FILLERS', value: r.filler_count != null ? `${r.filler_count}` : '—', color: '#f59e0b', sub: fillerSub },
            ].map((m) => (
              <div
                key={m.label}
                className="flex flex-col gap-1 rounded-lg border p-3"
                style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.22)' }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  {m.label}
                </span>
                <span className="font-mono text-xl font-semibold" style={{ color: m.color }}>
                  {m.value}
                </span>
                {m.sub && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{m.sub}</span>}
              </div>
            ))}
          </div>

          {/* Posture bar */}
          {r.posture_score != null && (
            <div
              className="rounded-lg border p-3"
              style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.22)' }}
            >
              <PostureBar score={r.posture_score} />
            </div>
          )}
        </div>
      </div>

      {/* Session comparison — only shown when a previous session exists */}
      {prevMetrics && <ComparisonPanel current={r} prev={prevMetrics} />}

      {/* Composite Confidence Score */}
      {r.confidence_score != null && (
        <ConfidenceCard
          score={r.confidence_score}
          sentiment={r.sentiment_score ?? null}
          clarity={r.voice_clarity_score ?? null}
          pitch={r.pitch_mean_hz ?? null}
          energy={r.energy_mean_db ?? null}
        />
      )}

      {/* Per-rubric MUET breakdown */}
      <RubricPanel rubricBands={r.rubric_bands} />

      {/* On-demand Band 5 model answer for this topic */}
      <ModelAnswerCard topic={r.topic_text} />

      {/* WPM pace chart */}
      {chartData && (
        <div
          className="flex flex-col gap-3 rounded-xl border p-5"
          style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              SPEAKING PACE (WPM)
            </div>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              <span className="flex items-center gap-1"><span style={{ width: 16, height: 1, background: '#f59e0b', display: 'inline-block' }} /> 130 WPM min</span>
              <span className="flex items-center gap-1"><span style={{ width: 16, height: 1, background: '#ef4444', display: 'inline-block' }} /> 150 WPM max</span>
            </div>
          </div>
          <div className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,165,148,0.08)" />
              <XAxis dataKey="t" tick={{ fill: '#9B8E80', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9B8E80', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-medium)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((v: number | undefined) => [`${v ?? '—'} WPM`, 'Pace']) as any}
              />
              <ReferenceLine y={130} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
              <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Line type="monotone" dataKey="wpm" stroke="#94a3b8" strokeWidth={2} dot={{ fill: '#94a3b8', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* IMP-03: Session replay with eye contact timeline */}
      {!isDemo && (
        <VideoPlayer
          presentationId={r.presentation_id}
          eyeContactTimeline={r.eye_contact_timeline ?? null}
          duration={r.duration_secs ?? null}
        />
      )}
      {isDemo && r.eye_contact_timeline && (
        <VideoPlayer
          presentationId="demo"
          eyeContactTimeline={r.eye_contact_timeline}
          duration={r.duration_secs ?? null}
        />
      )}

      {/* IMP-02: Transcript with amber filler highlights + breakdown */}
      {r.transcript && (
        <TranscriptViewer
          transcript={r.transcript}
          fillerCount={r.filler_count ?? null}
          fillerDensity={r.filler_density ?? null}
          durationSecs={r.duration_secs ?? null}
        />
      )}

      {/* What to fix first — top priority card */}
      {r.advice_cards && r.advice_cards.length > 0 && (() => {
        const top = r.advice_cards!.find(c => c.impact === 'HIGH') ?? r.advice_cards![0]
        return (
          <div
            className="flex flex-col gap-2 rounded-xl border p-5"
            style={{ background: 'rgba(58,125,106,0.05)', borderColor: 'rgba(58,125,106,0.25)' }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3A7D6A' }}>
              🎯 FIX THIS FIRST
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">{top.text}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Highest-impact change you can make before your next session.
            </p>
          </div>
        )
      })()}

      {/* Advice cards */}
      {r.advice_cards && r.advice_cards.length > 0 && (
        <motion.div
          className="flex flex-col gap-3 rounded-xl border p-5"
          style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              ALL INSIGHTS
            </div>
            <span className="text-[var(--text-tertiary)] text-xs">{r.advice_cards.length} items</span>
          </div>
          {r.advice_cards.map((card, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              className="flex items-start gap-3 rounded-lg border p-3"
              style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.22)' }}
            >
              <span className="text-[var(--text-tertiary)] text-sm mt-0.5 shrink-0">▸</span>
              <p className="flex-1 min-w-0 text-sm text-[var(--text-secondary)]">{card.text}</p>
              <Badge variant={IMPACT_VARIANT[card.impact]}>{card.impact}</Badge>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* IMP-01: Learning path recommendation */}
      {userId && <LearningPathPanel studentId={userId} rubricBands={r.rubric_bands ?? undefined} />}

      <div className="flex flex-wrap gap-3">
        <Link href="/practice"><Button variant="secondary" className="min-h-[44px]">New Session</Button></Link>
        <Link href="/progress"><Button variant="ghost" className="min-h-[44px]">View Progress →</Button></Link>
        <Button variant="ghost" className="min-h-[44px]" onClick={() => printReport(r)}>
          <Download size={14} className="mr-1.5" />
          Export PDF
        </Button>
      </div>
      </div>}

      {/* When exam-locked, show nav back to courses */}
      {examLocked && !educatorGrade && (
        <div className="flex flex-wrap gap-3">
          <Link href="/courses"><Button variant="secondary" className="min-h-[44px]">Back to My Courses</Button></Link>
        </div>
      )}
    </motion.div>
  )
}
