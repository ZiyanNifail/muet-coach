'use client'
import { useEffect, useState } from 'react'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { GitCompare, ExternalLink } from 'lucide-react'

interface Session {
  id: string
  session_date: string
  report_id: string
  feedback_reports: {
    band_score: number | null
    wpm_avg: number | null
    eye_contact_pct: number | null
    posture_score: number | null
    filler_count: number | null
    generated_at: string | null
    presentation_id: string
  } | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function bandLabel(score: number | null) {
  if (score == null) return '—'
  if (score >= 5.5) return 'Very Proficient'
  if (score >= 4.5) return 'Proficient'
  if (score >= 3.5) return 'High Intermediate'
  if (score >= 2.5) return 'Intermediate'
  if (score >= 1.5) return 'Limited'
  return 'Minimal'
}

function bandVariant(score: number | null): 'green' | 'blue' | 'amber' | 'red' {
  if (score == null) return 'red'
  if (score >= 5) return 'green'
  if (score >= 3.5) return 'blue'
  if (score >= 2.5) return 'amber'
  return 'red'
}

function MetricDiff({ label, a, b, unit = '', lowerBetter = false }: {
  label: string; a: number | null; b: number | null; unit?: string; lowerBetter?: boolean
}) {
  if (a == null || b == null) return (
    <div className="flex flex-col gap-0.5">
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80' }}>{label}</span>
      <span className="text-[#6B6050] text-sm">—</span>
    </div>
  )
  const diff = b - a
  const improved = lowerBetter ? diff < 0 : diff > 0
  const color = diff === 0 ? '#9B8E80' : improved ? '#22c55e' : '#ef4444'
  return (
    <div className="flex flex-col gap-0.5">
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80' }}>{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm text-[#6B6050]">{typeof a === 'number' ? a.toFixed(a % 1 ? 1 : 0) : a}{unit}</span>
        <span className="text-xs" style={{ color: '#C4B8A8' }}>→</span>
        <span className="font-mono text-sm font-semibold text-[#1C1A17]">{typeof b === 'number' ? b.toFixed(b % 1 ? 1 : 0) : b}{unit}</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {diff > 0 ? '+' : ''}{typeof diff === 'number' ? diff.toFixed(diff % 1 ? 1 : 0) : diff}{unit}
        </span>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_URL}/api/reports/history/${user.id}`, { headers })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setSessions(data.sessions || [])
      } catch {
        setError('Could not load session history.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const sessionA = sessions.find((s) => s.id === selected[0])
  const sessionB = sessions.find((s) => s.id === selected[1])
  const rA = sessionA?.feedback_reports
  const rB = sessionB?.feedback_reports

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80', marginBottom: 4 }}>
            PROGRESS
          </div>
          <h1 className="text-2xl font-semibold text-[#1C1A17]">Session History</h1>
          <p className="text-[#6B6050] text-sm mt-1">All your past practice sessions.</p>
        </div>
        {sessions.length >= 2 && !comparing && (
          <Button variant="ghost" onClick={() => setComparing(true)} disabled={selected.length < 2}>
            <GitCompare size={14} className="mr-2" />
            Compare {selected.length}/2
          </Button>
        )}
        {comparing && (
          <Button variant="ghost" onClick={() => { setComparing(false); setSelected([]) }}>
            ← Back to list
          </Button>
        )}
      </div>

      {/* Comparison panel */}
      {comparing && selected.length === 2 && rA && rB && (
        <div
          className="rounded-xl border p-5 flex flex-col gap-5"
          style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80' }}>
            SESSION COMPARISON
          </div>
          <div className="grid grid-cols-2 gap-4 pb-4" style={{ borderBottom: '1px solid rgba(180,165,148,0.22)' }}>
            <div>
              <span style={{ fontSize: 9, color: '#9B8E80', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Session A</span>
              <p className="text-[#1C1A17] text-sm mt-1">
                {sessionA?.feedback_reports?.generated_at
                  ? new Date(sessionA.feedback_reports.generated_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })
                  : new Date(sessionA?.session_date || '').toLocaleDateString('en-MY', { dateStyle: 'medium' })}
              </p>
            </div>
            <div>
              <span style={{ fontSize: 9, color: '#9B8E80', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Session B (latest)</span>
              <p className="text-[#1C1A17] text-sm mt-1">
                {sessionB?.feedback_reports?.generated_at
                  ? new Date(sessionB.feedback_reports.generated_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })
                  : new Date(sessionB?.session_date || '').toLocaleDateString('en-MY', { dateStyle: 'medium' })}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <MetricDiff label="Band Score" a={rA.band_score} b={rB.band_score} unit="" />
            <MetricDiff label="Avg WPM" a={rA.wpm_avg != null ? Math.round(rA.wpm_avg) : null} b={rB.wpm_avg != null ? Math.round(rB.wpm_avg) : null} unit=" wpm" />
            <MetricDiff label="Eye Contact" a={rA.eye_contact_pct != null ? Math.round(rA.eye_contact_pct) : null} b={rB.eye_contact_pct != null ? Math.round(rB.eye_contact_pct) : null} unit="%" />
            <MetricDiff label="Filler Words" a={rA.filler_count} b={rB.filler_count} lowerBetter />
            <MetricDiff label="Posture Score" a={rA.posture_score != null ? Math.round(rA.posture_score) : null} b={rB.posture_score != null ? Math.round(rB.posture_score) : null} unit="/100" />
          </div>
        </div>
      )}

      {/* Sessions list */}
      {loading ? (
        <div className="flex items-center justify-center h-32 rounded-xl border" style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}>
          <span className="text-[#9B8E80] text-sm">Loading sessions...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 rounded-xl border" style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}>
          <p className="text-[#ef4444] text-sm">{error}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 rounded-xl border gap-3" style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}>
          <p className="text-[#9B8E80] text-sm">No sessions yet. Complete your first practice session to see history here.</p>
          <Link href="/practice" className="text-[#94a3b8] text-sm hover:underline">Start a session →</Link>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(180,165,148,0.22)' }}>
          {/* Table header */}
          <div
            className="grid gap-4 px-5 py-3"
            style={{
              gridTemplateColumns: comparing ? 'auto 1fr auto auto auto' : '1fr auto auto auto auto',
              background: 'rgba(245,242,237,0.95)',
              borderBottom: '1px solid rgba(180,165,148,0.22)',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9B8E80',
            }}
          >
            {comparing && <span>SEL</span>}
            <span>Date</span>
            <span>Band</span>
            <span>WPM</span>
            <span>Eye Contact</span>
            <span>View</span>
          </div>

          {sessions.map((s, i) => {
            const r = s.feedback_reports
            const isSelected = selected.includes(s.id)
            const date = r?.generated_at || s.session_date
            return (
              <div
                key={s.id}
                className="grid gap-4 px-5 py-3.5 items-center transition-colors"
                style={{
                  gridTemplateColumns: comparing ? 'auto 1fr auto auto auto auto' : '1fr auto auto auto auto',
                  background: isSelected ? 'rgba(148,163,184,0.06)' : 'transparent',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(180,165,148,0.08)',
                  cursor: comparing ? 'pointer' : 'default',
                }}
                onClick={() => comparing && toggleSelect(s.id)}
              >
                {comparing && (
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                    style={{
                      borderColor: isSelected ? '#94a3b8' : 'rgba(180,165,148,0.40)',
                      background: isSelected ? '#94a3b8' : 'transparent',
                    }}
                  >
                    {isSelected && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                  </div>
                )}
                <span className="text-sm text-[#6B6050]">
                  {date ? new Date(date).toLocaleDateString('en-MY', { dateStyle: 'medium' }) : '—'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[#1C1A17]">
                    {r?.band_score != null ? r.band_score.toFixed(1) : '—'}
                  </span>
                  {r?.band_score != null && (
                    <Badge variant={bandVariant(r.band_score)}>{bandLabel(r.band_score)}</Badge>
                  )}
                </div>
                <span className="font-mono text-sm text-[#6B6050]">
                  {r?.wpm_avg != null ? `${Math.round(r.wpm_avg)} wpm` : '—'}
                </span>
                <span className="font-mono text-sm text-[#6B6050]">
                  {r?.eye_contact_pct != null ? `${Math.round(r.eye_contact_pct)}%` : '—'}
                </span>
                {r?.presentation_id ? (
                  <Link
                    href={`/results/${r.presentation_id}`}
                    className="flex items-center gap-1 text-[#94a3b8] text-xs hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} />
                    View
                  </Link>
                ) : (
                  <span className="text-[#C4B8A8] text-xs">—</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {sessions.length >= 2 && !comparing && (
        <p className="text-[#C4B8A8] text-xs">
          Click <strong className="text-[#9B8E80]">Compare</strong> then select 2 sessions to see a side-by-side metric diff.
        </p>
      )}
    </div>
  )
}
