'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Download } from 'lucide-react'

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
    { impact: 'HIGH', text: "Reduce filler words — 'um' detected 3 times. Pause briefly instead." },
    { impact: 'MED', text: 'Maintain eye contact above 70%. Look directly at the camera.' },
    { impact: 'MED', text: 'Expand vocabulary — use more domain-specific terminology.' },
    { impact: 'LOW', text: 'Use discourse markers (firstly, furthermore) to structure your talk.' },
    { impact: 'LOW', text: 'Vary sentence length — mix short statements with longer explanations.' },
  ],
  confidence_flags: { audio_ok: true, face_ok: true, pose_ok: true },
}

const IMPACT_VARIANT = { HIGH: 'red', MED: 'amber', LOW: 'blue' } as const
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function postureLabel(score: number | null): string {
  if (score === null) return 'N/A'
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
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
  if (score >= 3.5) return '#3b82f6'
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
      <circle cx={70} cy={70} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
      <circle
        cx={70} cy={70} r={R} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${C}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x={70} y={65} textAnchor="middle" fill={color}
        fontSize={28} fontWeight={700} fontFamily="monospace">
        {score.toFixed(1)}
      </text>
      <text x={70} y={83} textAnchor="middle" fill="#55556a" fontSize={9} letterSpacing="0.1em">
        BAND
      </text>
      <text x={70} y={97} textAnchor="middle" fill="#55556a" fontSize={9}>
        {bandDescriptor(score)}
      </text>
    </svg>
  )
}

// Posture progress bar
function PostureBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score))
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8888a0]">Posture Score</span>
        <span className="text-xs font-mono font-semibold" style={{ color }}>
          {Math.round(pct)}/100 · {postureLabel(score)}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, transition: 'width 1s ease' }}
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
<title>Feedback Report — PreCoach</title>
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
  .iL{background:#dbeafe;color:#2563eb}
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
<p class="sub">Generated by PreCoach &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-MY', { dateStyle: 'long' })}</p>

<div class="metrics">
  <div class="metric">
    <div class="mlabel">Band Score</div>
    <div class="mval" style="color:${color}">${r.band_score?.toFixed(1) ?? '—'}</div>
    <div class="msub">${r.band_score ? bandDescriptor(r.band_score) : ''}</div>
  </div>
  <div class="metric">
    <div class="mlabel">Avg WPM</div>
    <div class="mval" style="color:#2563eb">${r.wpm_avg ? Math.round(r.wpm_avg) : '—'}</div>
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
    <strong>${Math.round(r.posture_score)}/100 — ${postureLabel(r.posture_score)}</strong>
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
  PreCoach &nbsp;·&nbsp; AI-Driven Presentation Coaching Tool &nbsp;·&nbsp; Management and Science University FYP 2025
</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=950,height=750')
  if (!win) { alert('Please allow pop-ups to export PDF.'); return }
  win.document.write(html)
  win.document.close()
  win.addEventListener('load', () => win.print())
}

export default function ResultsPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? 'demo'
  const isDemo = id === 'demo'

  const [report, setReport] = useState<Report | null>(isDemo ? DEMO_REPORT : null)
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isDemo) return
    let cancelled = false
    let attempts = 0
    const MAX = 40

    async function fetchReport() {
      try {
        const res = await fetch(`${API_URL}/api/reports/${id}`)
        if (res.status === 404 && attempts < MAX) {
          attempts++
          if (!cancelled) setTimeout(fetchReport, 3000)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: Report = await res.json()
        if (!cancelled) { setReport(data); setLoading(false) }
      } catch {
        if (!cancelled) {
          setError('Could not load report. Showing demo data.')
          setReport(DEMO_REPORT)
          setLoading(false)
        }
      }
    }

    fetchReport()
    return () => { cancelled = true }
  }, [id, isDemo])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="max-w-sm w-full flex flex-col items-center gap-4 rounded-xl border p-8 text-center"
          style={{ background: 'rgba(14,14,22,0.55)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#f59e0b', boxShadow: '0 0 6px #f59e0b',
              animation: 'pulse 2s ease-in-out infinite', display: 'inline-block',
            }}
          />
          <h2 className="text-lg font-semibold text-[#e8e8f0]">Waiting for analysis...</h2>
          <p className="text-[#8888a0] text-sm">The AI is still processing your session.</p>
        </div>
      </div>
    )
  }

  const r = report!
  const chartData = r.pace_timeseries && r.pace_timeseries.length > 1
    ? r.pace_timeseries.map((p) => ({
        t: p.time_sec < 60
          ? `${p.time_sec}s`
          : `${Math.round(p.time_sec / 60)}m`,
        wpm: Math.round(p.wpm),
      }))
    : null

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: '#55556a', marginBottom: 4,
            }}
          >
            FEEDBACK REPORT{isDemo && ' · DEMO DATA'}{error && ' · DEMO FALLBACK'}
          </div>
          <h1 className="text-xl font-semibold text-[#e8e8f0]">Presentation Analysis</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => printReport(r)}>
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
        className="flex gap-5 rounded-xl border p-5"
        style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {/* Band ring */}
        {r.band_score != null && (
          <div className="shrink-0">
            <BandRing score={r.band_score} />
          </div>
        )}

        {/* Metric grid */}
        <div className="flex-1 flex flex-col gap-4 justify-center">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'AVG WPM', value: r.wpm_avg != null ? String(Math.round(r.wpm_avg)) : '—', color: '#3b82f6', sub: 'Target 130–150' },
              { label: 'EYE CONTACT', value: r.eye_contact_pct != null ? `${Math.round(r.eye_contact_pct)}%` : '—', color: '#22c55e', sub: 'Target ≥70%' },
              { label: 'FILLERS', value: r.filler_count != null ? `${r.filler_count}` : '—', color: '#f59e0b', sub: r.filler_density != null ? `${r.filler_density.toFixed(1)}/min` : '' },
            ].map((m) => (
              <div
                key={m.label}
                className="flex flex-col gap-1 rounded-lg border p-3"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#55556a' }}>
                  {m.label}
                </span>
                <span className="font-mono text-xl font-semibold" style={{ color: m.color }}>
                  {m.value}
                </span>
                {m.sub && <span style={{ fontSize: 10, color: '#3a3a52' }}>{m.sub}</span>}
              </div>
            ))}
          </div>

          {/* Posture bar */}
          {r.posture_score != null && (
            <div
              className="rounded-lg border p-3"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <PostureBar score={r.posture_score} />
            </div>
          )}
        </div>
      </div>

      {/* WPM pace chart */}
      {chartData && (
        <div
          className="flex flex-col gap-3 rounded-xl border p-5"
          style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
              SPEAKING PACE (WPM)
            </div>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: '#55556a' }}>
              <span className="flex items-center gap-1"><span style={{ width: 16, height: 1, background: '#f59e0b', display: 'inline-block' }} /> 130 WPM min</span>
              <span className="flex items-center gap-1"><span style={{ width: 16, height: 1, background: '#ef4444', display: 'inline-block' }} /> 150 WPM max</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fill: '#55556a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#55556a', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'rgba(14,14,22,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e8f0', fontSize: 12 }}
                formatter={(v: number) => [`${v} WPM`, 'Pace']}
              />
              <ReferenceLine y={130} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
              <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Line type="monotone" dataKey="wpm" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transcript */}
      {r.transcript && (
        <div
          className="flex flex-col gap-3 rounded-xl border p-5"
          style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
            TRANSCRIPT
          </div>
          <p className="text-[#8888a0] text-sm leading-7">
            {r.transcript.split(/(\[[^\]]+\])/).map((part, i) =>
              /^\[.+\]$/.test(part) ? (
                <mark key={i} className="rounded px-0.5 not-italic" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                  {part.slice(1, -1)}
                </mark>
              ) : part
            )}
          </p>
          {r.filler_count != null && r.filler_count > 0 && (
            <p className="text-xs text-[#55556a]">
              {r.filler_count} filler word{r.filler_count !== 1 ? 's' : ''} detected
              {r.filler_density != null && ` · ${r.filler_density.toFixed(1)}/min`}
            </p>
          )}
        </div>
      )}

      {/* Advice cards */}
      {r.advice_cards && r.advice_cards.length > 0 && (
        <div
          className="flex flex-col gap-3 rounded-xl border p-5"
          style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
              INSIGHTS
            </div>
            <span className="text-[#55556a] text-xs">{r.advice_cards.length} NODES</span>
          </div>
          {r.advice_cards.map((card, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border p-3"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <span className="text-[#55556a] text-sm mt-0.5 shrink-0">▸</span>
              <p className="flex-1 text-sm text-[#8888a0]">{card.text}</p>
              <Badge variant={IMPACT_VARIANT[card.impact]}>{card.impact}</Badge>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/practice"><Button variant="secondary">New Session</Button></Link>
        <Link href="/progress"><Button variant="ghost">View Progress →</Button></Link>
        <Button variant="ghost" onClick={() => printReport(r)}>
          <Download size={14} className="mr-1.5" />
          Export PDF
        </Button>
      </div>
    </div>
  )
}
