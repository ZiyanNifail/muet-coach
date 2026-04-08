'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { swrFetcher } from '@/lib/api'

interface SessionPoint {
  session_date: string
  report_id: string
  feedback_reports: {
    band_score: number | null
    wpm_avg: number | null
    generated_at: string | null
  } | null
}

function SkeletonCard() {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border p-4 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="h-2 w-16 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-7 w-20 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-2 w-24 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

function bandColor(band: number | null) {
  if (band == null) return '#8b5cf6'
  if (band >= 5) return '#22c55e'
  if (band >= 4) return '#94a3b8'
  if (band >= 3) return '#f59e0b'
  return '#ef4444'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function DashboardPage() {
  const [swrKey, setSwrKey] = useState<[string, string] | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSwrKey([`/api/reports/history/${session.user.id}`, session.access_token])
      }
    })
  }, [])

  const { data, isLoading } = useSWR(swrKey, swrFetcher, {
    revalidateOnFocus: false,
  })

  const sessions: SessionPoint[] = data?.sessions ?? []

  const bands = sessions
    .map((s) => s.feedback_reports?.band_score)
    .filter((b): b is number => b != null)

  const latestBand = bands.at(-1) ?? null
  const bestBand = bands.length > 0 ? Math.max(...bands) : null
  const totalSessions = sessions.length

  const recentSessions = [...sessions]
    .reverse()
    .slice(0, 5)

  const metrics = [
    {
      label: 'CURRENT BAND',
      value: latestBand != null ? latestBand.toFixed(1) : '—',
      sub: latestBand != null ? 'Latest session score' : 'No sessions yet',
      color: bandColor(latestBand),
    },
    {
      label: 'BEST BAND',
      value: bestBand != null ? bestBand.toFixed(1) : '—',
      sub: bestBand != null ? 'Personal best' : 'No sessions yet',
      color: '#f59e0b',
    },
    {
      label: 'TOTAL SESSIONS',
      value: String(totalSessions),
      sub: totalSessions === 1 ? '1 session completed' : `${totalSessions} sessions completed`,
      color: '#22c55e',
    },
  ]

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#55556a',
            marginBottom: 4,
          }}
        >
          OVERVIEW
        </div>
        <h1 className="text-2xl font-semibold text-[#e8e8f0]">Dashboard</h1>
        <p className="text-[#8888a0] text-sm mt-1">
          Track your presentation progress and start a new session.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        {isLoading
          ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
          : metrics.map((m) => (
              <div
                key={m.label}
                className="flex flex-col gap-1 rounded-lg border p-4"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: '#55556a',
                  }}
                >
                  {m.label}
                </span>
                <span className="font-mono text-2xl font-semibold" style={{ color: m.color }}>
                  {m.value}
                </span>
                <span className="text-xs text-[#8888a0]">{m.sub}</span>
              </div>
            ))}
      </div>

      {/* Start practice CTA */}
      <div
        className="flex flex-col gap-4 rounded-xl border p-6"
        style={{
          background: 'rgba(14,14,22,0.45)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#55556a',
                marginBottom: 4,
              }}
            >
              START PRACTICE
            </div>
            <h2 className="text-lg font-semibold text-[#e8e8f0]">Ready to practise?</h2>
            <p className="text-[#8888a0] text-sm mt-1">
              Choose a session mode and get AI-powered feedback on your presentation skills.
            </p>
          </div>
          <Badge variant="green">Available</Badge>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/practice?mode=unguided">
            <Button variant="secondary">Unguided Session</Button>
          </Link>
          <Link href="/practice?mode=guided">
            <Button>Guided Session →</Button>
          </Link>
        </div>
      </div>

      {/* Recent sessions */}
      <div
        className="flex flex-col gap-3 rounded-xl border p-6"
        style={{
          background: 'rgba(14,14,22,0.45)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#55556a',
          }}
        >
          RECENT SESSIONS
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-3 animate-pulse"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <div className="h-3 w-32 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-3 w-12 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-[#55556a] text-sm">
              No sessions yet. Start your first practice session above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentSessions.map((s) => {
              const band = s.feedback_reports?.band_score
              const date = formatDate(s.feedback_reports?.generated_at ?? s.session_date)
              return (
                <Link
                  key={s.report_id}
                  href={`/results/${s.report_id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                >
                  <span className="text-[#8888a0] text-sm">{date}</span>
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: bandColor(band ?? null) }}
                  >
                    {band != null ? `Band ${band.toFixed(1)}` : '—'}
                  </span>
                </Link>
              )
            })}
            {sessions.length > 5 && (
              <Link href="/progress" className="text-center text-xs text-[#55556a] hover:text-[#8888a0] pt-1 transition-colors">
                View all {sessions.length} sessions →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
