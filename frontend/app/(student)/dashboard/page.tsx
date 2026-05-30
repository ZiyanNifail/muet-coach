'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Marquee } from '@/components/ui/marquee'
import { supabase } from '@/lib/supabase'
import { swrFetcher } from '@/lib/api'
import { staggerContainer, staggerItem, springPop } from '@/lib/motion'

const MUET_VIDEOS = [
  {
    id: '5m-C5mwpmxU',
    title: 'The 3-2-1 Speaking Trick That Forces You To Stop Rambling',
  },
  {
    id: 'Sh-se-i0afA',
    title: 'In 7 Minutes, You\'ll Be 170% Better At Presentations',
  },
  {
    id: '-9uHBEGpJm4',
    title: 'How to Build Rapport — Tony Robbins',
  },
]

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
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="h-2 w-16 rounded" style={{ background: 'var(--border-subtle)' }} />
      <div className="h-7 w-20 rounded" style={{ background: 'var(--border-medium)' }} />
      <div className="h-2 w-24 rounded" style={{ background: 'var(--bg-surface)' }} />
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

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface AdviceCard {
  impact: 'HIGH' | 'MED' | 'LOW'
  text: string
}

function deriveLabel(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('filler')) return 'Filler Words'
  if (t.includes('eye contact') || t.includes('gaze') || t.includes('camera')) return 'Eye Contact'
  if (t.includes('pace') || t.includes('speed') || t.includes('wpm') || t.includes('fast') || t.includes('slow')) return 'Pacing'
  if (t.includes('vocabular') || t.includes('word choice') || t.includes('synonym')) return 'Vocabulary'
  if (t.includes('fluency') || t.includes('pause') || t.includes('hesitat')) return 'Fluency'
  if (t.includes('coheren') || t.includes('structur') || t.includes('organised') || t.includes('organized')) return 'Coherence'
  if (t.includes('pronounc')) return 'Pronunciation'
  if (t.includes('confiden')) return 'Confidence'
  if (t.includes('posture') || t.includes('body language')) return 'Body Language'
  return 'Delivery'
}

function impactStyle(impact: 'HIGH' | 'MED' | 'LOW') {
  if (impact === 'HIGH') return { dot: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.22)' }
  if (impact === 'MED') return { dot: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)' }
  return { dot: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.22)' }
}

function RightPanel({
  sessions,
  isLoading,
  latestBand,
  adviceCards,
  adviceLoading,
}: {
  sessions: SessionPoint[]
  isLoading: boolean
  latestBand: number | null
  adviceCards: AdviceCard[]
  adviceLoading: boolean
}) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const monthName = now.toLocaleDateString('en', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Monday-first offset
  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = (firstDay + 6) % 7

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, SessionPoint[]>()
    for (const s of sessions) {
      const raw = s.feedback_reports?.generated_at ?? s.session_date
      if (!raw) continue
      const d = new Date(raw)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map.has(day)) map.set(day, [])
        map.get(day)!.push(s)
      }
    }
    return map
  }, [sessions, year, month])

  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const monthShort = now.toLocaleDateString('en', { month: 'short' })

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)


  return (
    <div className="flex flex-col gap-4">
      {/* Monthly calendar */}
      <div
        data-tour="practice-calendar"
        className="rounded-xl border p-5 flex flex-col gap-4"
        style={{
          background: 'var(--bg-panel)',
          borderColor: 'var(--border-subtle)',
          backdropFilter: 'blur(12px)',
          transition: 'background 0.3s ease, color 0.3s ease',
        }}
      >
        <div className="flex items-center justify-between">
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            PRACTICE ACTIVITY
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{monthName}</span>
        </div>

        {isLoading ? (
          <div className="animate-pulse rounded-lg" style={{ height: 172, background: 'var(--bg-surface)' }} />
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center',
                    fontSize: 9,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    paddingBottom: 2,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {cells.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />
                const daySessions = sessionsByDay.get(day)
                const hasSession = !!daySessions
                const isToday = day === today
                const isHovered = hoveredDay === day
                return (
                  <div
                    key={day}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => {
                      if (!hasSession) return
                      if (hideTimer.current) clearTimeout(hideTimer.current)
                      setHoveredDay(day)
                    }}
                    onMouseLeave={() => {
                      hideTimer.current = setTimeout(() => setHoveredDay(null), 180)
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: '1',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        background: hasSession
                          ? isHovered ? '#16a34a' : '#22c55e'
                          : isToday
                          ? 'var(--accent-teal-dim)'
                          : 'var(--bg-surface)',
                        color: hasSession ? '#fff' : isToday ? 'var(--accent-teal)' : 'var(--text-tertiary)',
                        border: isToday
                          ? '2px solid var(--accent-teal)'
                          : '1px solid transparent',
                        fontWeight: isToday ? 700 : 400,
                        cursor: hasSession ? 'pointer' : 'default',
                        transform: isHovered && hasSession ? 'scale(1.1)' : 'scale(1)',
                        transition: 'background 0.15s ease, transform 0.15s ease',
                      }}
                    >
                      {day}
                    </div>

                    {isHovered && daySessions && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 6px)',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 50,
                          background: 'var(--bg-panel)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 8,
                          boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
                          minWidth: 160,
                          overflow: 'hidden',
                        }}
                        onMouseEnter={() => {
                          if (hideTimer.current) clearTimeout(hideTimer.current)
                        }}
                        onMouseLeave={() => {
                          hideTimer.current = setTimeout(() => setHoveredDay(null), 180)
                        }}
                      >
                        <div style={{ padding: '6px 10px 4px', borderBottom: '1px solid var(--border-subtle)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                          {day} {monthShort}
                        </div>
                        {daySessions.map((s) => {
                          const band = s.feedback_reports?.band_score
                          return (
                            <Link
                              key={s.report_id}
                              href={`/results/${s.report_id}`}
                              className="flex items-center justify-between no-underline"
                              style={{ padding: '6px 10px', color: 'var(--text-primary)', display: 'flex', transition: 'background 0.1s' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(58,125,106,0.08)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <span style={{ fontSize: 11 }}>View session</span>
                              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: bandColor(band ?? null) }}>
                                {band != null ? `Band ${band.toFixed(1)}` : '...'}
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 justify-end pt-1">
              <div className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: 3, background: '#22c55e' }} />
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Session</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent-teal-dim)', border: '2px solid var(--accent-teal)' }} />
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--bg-surface)' }} />
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>No session</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Focus areas — only shown after at least one session */}
      {(adviceLoading || adviceCards.length > 0) && (
        <div
          className="rounded-xl border p-5 flex flex-col gap-3"
          style={{
            background: 'var(--bg-panel)',
            borderColor: 'var(--border-subtle)',
            backdropFilter: 'blur(12px)',
            transition: 'background 0.3s ease, color 0.3s ease',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            FOCUS AREAS
          </div>

          {adviceLoading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-2.5 animate-pulse">
                  <div className="w-5 h-5 rounded flex-shrink-0 mt-0.5" style={{ background: 'var(--border-subtle)' }} />
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="h-2.5 w-20 rounded" style={{ background: 'var(--border-subtle)' }} />
                    <div className="h-2 w-full rounded" style={{ background: 'var(--bg-surface)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {adviceCards.slice(0, 4).map((card, i) => {
                const label = deriveLabel(card.text)
                const style = impactStyle(card.impact)
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: style.bg, border: `1px solid ${style.border}` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      <p className="text-[11px] leading-[1.5] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{card.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [swrKey, setSwrKey] = useState<[string, string] | null>(null)
  const [activeVideo, setActiveVideo] = useState<string | null>(null)

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

  const latestReportId = sessions.at(-1)?.report_id ?? null
  const authToken = swrKey?.[1] ?? ''
  const reportSwrKey = latestReportId && authToken ? [`/api/reports/${latestReportId}`, authToken] as [string, string] : null
  const { data: reportData, isLoading: adviceLoading } = useSWR(reportSwrKey, swrFetcher, {
    revalidateOnFocus: false,
  })
  const adviceCards: AdviceCard[] = reportData?.report?.advice_cards ?? []

  const latestBand = bands.at(-1) ?? null
  const prevBand   = bands.length >= 2 ? bands[bands.length - 2] : null
  const bestBand   = bands.length > 0 ? Math.max(...bands) : null
  const totalSessions = sessions.length
  const trend = latestBand != null && prevBand != null
    ? Number((latestBand - prevBand).toFixed(1))
    : null

  const recentSessions = [...sessions].reverse().slice(0, 5)

  const metrics = [
    {
      label: 'CURRENT BAND',
      value: latestBand != null ? latestBand.toFixed(1) : '—',
      sub: trend != null
        ? trend > 0 ? `↑ ${trend.toFixed(1)} from last session` : trend < 0 ? `↓ ${Math.abs(trend).toFixed(1)} from last session` : 'Same as last session'
        : latestBand != null ? 'First session recorded' : 'No sessions yet',
      color: bandColor(latestBand),
      trendColor: trend != null ? (trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#9B8E80') : undefined,
    },
    {
      label: 'BEST BAND',
      value: bestBand != null ? bestBand.toFixed(1) : '—',
      sub: bestBand != null && latestBand != null && bestBand > latestBand
        ? `${(bestBand - latestBand).toFixed(1)} above current — keep pushing`
        : bestBand != null ? 'Personal best — maintain this' : 'No sessions yet',
      color: '#f59e0b',
      trendColor: undefined,
    },
    {
      label: 'TOTAL SESSIONS',
      value: String(totalSessions),
      sub: totalSessions === 0 ? 'Start your first session below'
        : totalSessions === 1 ? '1 session completed'
        : `${totalSessions} sessions completed`,
      color: '#22c55e',
      trendColor: undefined,
    },
  ]

  const isEmpty = !isLoading && totalSessions === 0

  return (
    <div className="p-4 md:p-6 flex flex-col md:grid md:grid-cols-[1fr_300px] gap-4 md:gap-6 md:items-start">

      {/* ── 1. Heading ── */}
      <div className="md:col-start-1">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Track your presentation progress and start a new session.
        </p>
      </div>

      {/* ── 2. Compact metrics strip — MOBILE ONLY ── */}
      {!isEmpty && (
        <div className="md:hidden md:col-start-1 rounded-xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          {isLoading ? (
            <div className="flex divide-x" style={{ borderColor: 'var(--border-subtle)' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex-1 p-4 animate-pulse flex flex-col gap-2">
                  <div className="h-2 w-12 rounded" style={{ background: 'var(--border-subtle)' }} />
                  <div className="h-6 w-10 rounded" style={{ background: 'var(--border-medium)' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--border-subtle)' }}>
              {metrics.map((m, i) => (
                <div key={m.label} className="p-3 flex flex-col gap-0.5">
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                    {i === 0 ? 'Current' : i === 1 ? 'Best' : 'Sessions'}
                  </span>
                  <span className="font-mono text-xl font-bold" style={{ color: m.color }}>{m.value}</span>
                  <span style={{ fontSize: 10, color: m.trendColor ?? 'var(--text-tertiary)', lineHeight: 1.3 }}>{m.sub}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3. Right panel (calendar + focus) — 3rd on mobile, col-2 on desktop ── */}
      <div className="md:col-start-2 md:row-start-1 md:row-span-5">
        <RightPanel sessions={sessions} isLoading={isLoading} latestBand={latestBand} adviceCards={adviceCards} adviceLoading={adviceLoading} />
      </div>

      {/* ── 4. Empty / onboarding state ── */}
      {isEmpty && (
        <div
          className="md:col-start-1 rounded-xl border p-8 flex flex-col items-center text-center gap-4"
          style={{ background: 'rgba(58,125,106,0.04)', borderColor: 'rgba(58,125,106,0.18)', borderStyle: 'dashed' }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(58,125,106,0.10)' }}>
            <span style={{ fontSize: 22 }}>🎙️</span>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Welcome to fluency.my</p>
            <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              You haven&apos;t recorded any sessions yet. Start with a Guided Session for real-time coaching, or an Unguided Session to establish your baseline.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link href="/practice?mode=guided">
              <Button>Start Guided Session →</Button>
            </Link>
            <Link href="/practice?mode=unguided">
              <Button variant="secondary">Unguided Session</Button>
            </Link>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Your first report is ready in under 60 seconds.</p>
        </div>
      )}

      {/* ── 5. Full metric cards — DESKTOP ONLY ── */}
      {!isEmpty && (
        <motion.div
          className="hidden md:grid md:col-start-1 grid-cols-3 gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {isLoading
            ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
            : metrics.map((m) => (
                <motion.div
                  key={m.label}
                  variants={staggerItem}
                  className="flex flex-col gap-1 rounded-lg border p-4"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
                >
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                    {m.label}
                  </span>
                  <span className="font-mono text-2xl font-semibold" style={{ color: m.color }}>{m.value}</span>
                  <span className="text-xs" style={{ color: m.trendColor ?? 'var(--text-secondary)' }}>{m.sub}</span>
                </motion.div>
              ))}
        </motion.div>
      )}

      {/* ── 6. MUET video resources ── */}
      <div
          className="md:col-start-1 flex flex-col gap-4 rounded-xl border overflow-hidden"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(12px)', transition: 'background 0.3s ease' }}
        >
          <div className="px-6 pt-5 pb-0">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
              MUET RESOURCES
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Watch &amp; Learn</h2>
          </div>
          <Marquee duration={28} pauseOnHover fade fadeAmount={8}>
            {MUET_VIDEOS.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveVideo(v.id)}
                className="mx-3 mb-5 flex flex-col rounded-xl overflow-hidden border group cursor-pointer text-left"
                style={{ width: 260, flexShrink: 0, background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                <div className="relative" style={{ height: 146 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
                    alt={v.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.92)' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 2.5L13 8L4 13.5V2.5Z" fill="var(--text-primary)" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{v.title}</p>
                </div>
              </button>
            ))}
          </Marquee>
        </div>

      {/* ── 7. Recent sessions ── */}
      {!isEmpty && <div
          className="md:col-start-1 flex flex-col gap-3 rounded-xl border p-6"
          style={{
            background: 'var(--bg-panel)',
            borderColor: 'var(--border-subtle)',
            backdropFilter: 'blur(12px)',
            transition: 'background 0.3s ease, color 0.3s ease',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
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
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="h-3 w-32 rounded" style={{ background: 'var(--border-subtle)' }} />
                  <div className="h-3 w-12 rounded" style={{ background: 'var(--border-subtle)' }} />
                </div>
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="flex items-center justify-center h-20">
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No sessions yet. Start your first practice session above.
              </p>
            </div>
          ) : (
            <motion.div
              className="flex flex-col gap-2"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {recentSessions.map((s) => {
                const band = s.feedback_reports?.band_score
                const wpm  = s.feedback_reports?.wpm_avg
                const date = formatDate(s.feedback_reports?.generated_at ?? s.session_date)
                return (
                  <motion.div key={s.report_id} variants={staggerItem}>
                  <Link
                    href={`/results/${s.report_id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-all group"
                    style={{
                      background: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(58,125,106,0.30)'
                      e.currentTarget.style.background = 'rgba(58,125,106,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                      e.currentTarget.style.background = 'var(--bg-surface)'
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{date}</span>
                      {wpm != null && (
                        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{Math.round(wpm)} WPM</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="font-mono text-sm font-semibold"
                        style={{ color: bandColor(band ?? null) }}
                      >
                        {band != null ? `Band ${band.toFixed(1)}` : '—'}
                      </span>
                      <span className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-teal)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>→</span>
                    </div>
                  </Link>
                  </motion.div>
                )
              })}
              {sessions.length > 5 && (
                <Link
                  href="/progress"
                  className="text-center text-xs pt-1 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  View all {sessions.length} sessions →
                </Link>
              )}
            </motion.div>
          )}
        </div>}

      {/* ── Video modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
      {activeVideo && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setActiveVideo(null)}
        >
          <motion.div
            className="relative w-full max-w-3xl rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
            variants={springPop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.80)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.55)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {/* 16:9 iframe */}
            <div style={{ paddingTop: '56.25%', position: 'relative', background: '#000' }}>
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`}
                title="MUET Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
