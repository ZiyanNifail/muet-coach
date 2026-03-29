'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, BookOpen, FileCheck, TrendingUp, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

interface CourseStats {
  id: string
  name: string
  subject_code: string
  student_count: number
  submission_count: number
  avg_band: number | null
  avg_wpm: number | null
  avg_eye_contact: number | null
}

interface Analytics {
  totals: {
    course_count: number
    student_count: number
    submission_count: number
    avg_band: number | null
  }
  courses: CourseStats[]
  top_issues: { text: string; count: number }[]
  band_distribution: { '1-2': number; '2-3': number; '3-4': number; '4-5': number; '5+': number }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function bandColor(band: number | null): string {
  if (band == null) return '#3a3a52'
  if (band >= 4.5) return '#22c55e'
  if (band >= 3.5) return '#3b82f6'
  if (band >= 2.5) return '#f59e0b'
  return '#ef4444'
}

function BandBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-[#55556a] w-8 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: 'rgba(245,158,11,0.55)' }}
        />
      </div>
      <span className="font-mono text-xs text-[#8888a0] w-5 text-right shrink-0">{count}</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setError('Not authenticated.'); setLoading(false); return }

      const res = await fetch(`${API_URL}/api/courses/analytics?educator_id=${user.id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch {
      setError('Could not load analytics. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const maxBandCount = data
    ? Math.max(...Object.values(data.band_distribution), 1)
    : 1

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/educator/dashboard">
            <button className="mt-1 text-[#6b6050] hover:text-[#c08830] transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6050', marginBottom: 4 }}>
              INSIGHTS
            </div>
            <h1 className="text-2xl font-semibold text-[#e8e8f0]">Class Analytics</h1>
            <p className="text-[#8888a0] text-sm mt-1">
              Aggregated student performance across all your courses.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-[#55556a] hover:text-[#8888a0] transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 rounded-xl border"
          style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-[#55556a] text-sm">Loading analytics...</span>
        </div>
      ) : data ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'COURSES', value: String(data.totals.course_count), icon: BookOpen, color: '#f59e0b' },
              { label: 'TOTAL STUDENTS', value: String(data.totals.student_count), icon: Users, color: '#3b82f6' },
              { label: 'SUBMISSIONS', value: String(data.totals.submission_count), icon: FileCheck, color: '#8b5cf6' },
              {
                label: 'AVG BAND SCORE',
                value: data.totals.avg_band != null ? data.totals.avg_band.toFixed(2) : '—',
                icon: TrendingUp,
                color: bandColor(data.totals.avg_band),
              },
            ].map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="flex items-center gap-4 rounded-xl border p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <Icon size={20} style={{ color: s.color, opacity: 0.7, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>{s.label}</div>
                    <div className="font-mono text-xl font-semibold" style={{ color: s.color }}>{s.value}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-5">
            {/* Course breakdown */}
            <div className="col-span-2 flex flex-col gap-3">
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
                COURSE BREAKDOWN
              </div>

              {data.courses.length === 0 ? (
                <div className="flex items-center justify-center h-32 rounded-xl border"
                  style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-[#3a3a52] text-sm">No courses yet.</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden"
                  style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  {/* Table header */}
                  <div className="grid px-4 py-2.5"
                    style={{
                      gridTemplateColumns: '1fr 60px 70px 80px 70px 80px',
                      background: 'rgba(255,255,255,0.03)',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                    {['COURSE', 'STUDENTS', 'SUBMITTED', 'AVG BAND', 'AVG WPM', 'EYE CTX'].map((h) => (
                      <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#3a3a52' }}>{h}</div>
                    ))}
                  </div>

                  {data.courses.map((c, i) => (
                    <div
                      key={c.id}
                      className="grid items-center px-4 py-3.5"
                      style={{
                        gridTemplateColumns: '1fr 60px 70px 80px 70px 80px',
                        borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-sm font-semibold text-[#e8e8f0] truncate">{c.name}</div>
                        <div className="text-[10px] font-mono text-[#f59e0b]">{c.subject_code}</div>
                      </div>
                      <div className="font-mono text-sm" style={{ color: '#3b82f6' }}>{c.student_count}</div>
                      <div className="font-mono text-sm text-[#8888a0]">{c.submission_count}</div>
                      <div className="font-mono text-sm font-semibold" style={{ color: bandColor(c.avg_band) }}>
                        {c.avg_band != null ? c.avg_band.toFixed(2) : '—'}
                      </div>
                      <div className="font-mono text-sm text-[#8888a0]">
                        {c.avg_wpm != null ? Math.round(c.avg_wpm) : '—'}
                      </div>
                      <div className="font-mono text-sm text-[#8888a0]">
                        {c.avg_eye_contact != null ? `${Math.round(c.avg_eye_contact)}%` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column: band distribution + top issues */}
            <div className="flex flex-col gap-5">
              {/* Band distribution */}
              <div className="flex flex-col gap-3 rounded-xl border p-4"
                style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
                  BAND DISTRIBUTION
                </div>
                <div className="flex flex-col gap-2.5">
                  {(Object.entries(data.band_distribution) as [string, number][]).map(([label, count]) => (
                    <BandBar key={label} label={label} count={count} max={maxBandCount} />
                  ))}
                </div>
                {data.totals.submission_count === 0 && (
                  <p className="text-[#3a3a52] text-xs mt-1">No submissions with scores yet.</p>
                )}
              </div>

              {/* Top issues */}
              <div className="flex flex-col gap-3 rounded-xl border p-4"
                style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
                  TOP RECURRING ISSUES
                </div>
                {data.top_issues.length === 0 ? (
                  <p className="text-[#3a3a52] text-xs">No AI feedback data yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {data.top_issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertCircle size={12} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                        <span className="text-xs text-[#8888a0] leading-5 flex-1">{issue.text}</span>
                        <Badge variant="amber">{issue.count}×</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
