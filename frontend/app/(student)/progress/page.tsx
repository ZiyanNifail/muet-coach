'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { swrFetcher } from '@/lib/api'
import Link from 'next/link'
import { LearningPathPanel } from '@/components/LearningPathPanel'

interface SessionPoint {
  session_date: string
  report_id: string
  feedback_reports: {
    band_score: number | null
    wpm_avg: number | null
    eye_contact_pct: number | null
    filler_count: number | null
    posture_score: number | null
    generated_at: string | null
  } | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })
}

function SparkLine({
  data, dataKey, color, label, unit = '', refVal,
}: {
  data: Record<string, number | string>[]
  dataKey: string
  color: string
  label: string
  unit?: string
  refVal?: number
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-4"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        {label}
      </div>
      <ResponsiveContainer width="100%" height={70}>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: -30 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-medium)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 11 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((v: number | undefined) => [`${v ?? '—'}${unit}`, label]) as any}
            labelFormatter={(l) => l}
          />
          {refVal !== undefined && (
            <ReferenceLine y={refVal} stroke={color} strokeDasharray="3 3" strokeOpacity={0.35} />
          )}
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={{ fill: color, r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function ProgressPage() {
  const [swrKey, setSwrKey] = useState<[string, string] | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        setSwrKey([`/api/reports/history/${session.user.id}`, session.access_token])
      }
    })
  }, [])

  const { data, isLoading: loading, error: swrError } = useSWR(swrKey, swrFetcher, {
    revalidateOnFocus: false,
  })

  const sessions: SessionPoint[] = data?.sessions ?? []
  const error = swrError ? 'Could not load progress data.' : null

  const hasSessions = sessions.length >= 2

  // Build chart datasets
  const bandData = sessions
    .filter((s) => s.feedback_reports?.band_score != null)
    .map((s) => ({
      date: formatDate(s.feedback_reports?.generated_at || s.session_date),
      band: s.feedback_reports!.band_score!,
    }))

  const wpmData = sessions
    .filter((s) => s.feedback_reports?.wpm_avg != null)
    .map((s) => ({
      date: formatDate(s.feedback_reports?.generated_at || s.session_date),
      wpm: Math.round(s.feedback_reports!.wpm_avg!),
    }))

  const eyeData = sessions
    .filter((s) => s.feedback_reports?.eye_contact_pct != null)
    .map((s) => ({
      date: formatDate(s.feedback_reports?.generated_at || s.session_date),
      eye: Math.round(s.feedback_reports!.eye_contact_pct!),
    }))

  const fillerData = sessions
    .filter((s) => s.feedback_reports?.filler_count != null)
    .map((s) => ({
      date: formatDate(s.feedback_reports?.generated_at || s.session_date),
      filler: s.feedback_reports!.filler_count!,
    }))

  const postureData = sessions
    .filter((s) => s.feedback_reports?.posture_score != null)
    .map((s) => ({
      date: formatDate(s.feedback_reports?.generated_at || s.session_date),
      posture: Math.round(s.feedback_reports!.posture_score!),
    }))

  // Latest band
  const latestBand = bandData.length > 0 ? bandData[bandData.length - 1].band : null
  const firstBand = bandData.length > 1 ? bandData[0].band : null
  const improvement = latestBand != null && firstBand != null ? (latestBand - firstBand).toFixed(1) : null

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
          PROGRESS
        </div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Band Timeline</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Track your CEFR band score and metrics across all sessions.</p>
      </div>

      {/* Summary strip */}
      {hasSessions && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'SESSIONS', value: String(sessions.length), color: '#8b5cf6' },
            { label: 'LATEST BAND', value: latestBand != null ? latestBand.toFixed(1) : '—', color: '#94a3b8' },
            { label: 'IMPROVEMENT', value: improvement != null ? (Number(improvement) >= 0 ? `+${improvement}` : improvement) : '—', color: Number(improvement) >= 0 ? '#22c55e' : '#ef4444' },
          ].map((m) => (
            <div key={m.label} className="flex flex-col gap-1 rounded-lg border p-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{m.label}</span>
              <span className="font-mono text-xl font-semibold" style={{ color: m.color }}>{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Band score timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-48 rounded-xl border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading progress...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 rounded-xl border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</p>
        </div>
      ) : !hasSessions ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl border gap-3" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Complete at least 2 sessions to see your progress trend.</p>
          <Link href="/practice" className="text-sm hover:underline" style={{ color: 'var(--text-tertiary)' }}>Start a session →</Link>
        </div>
      ) : (
        <>
          {/* Main band chart */}
          {bandData.length >= 2 && (
            <div
              className="flex flex-col gap-3 rounded-xl border p-5"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
            >
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                BAND SCORE OVER TIME
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bandData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[1, 6]} ticks={[1, 2, 3, 4, 5, 6]} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-medium)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((v: number | undefined) => [`Band ${(v ?? 0).toFixed(1)}`, 'Score']) as any}
                  />
                  <ReferenceLine y={3.5} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.4} />
                  <Line type="monotone" dataKey="band" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sparklines grid */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12 }}>
              PER-METRIC TRENDS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wpmData.length >= 2 && (
                <SparkLine data={wpmData} dataKey="wpm" color="#94a3b8" label="Speaking Pace (WPM)" unit=" wpm" refVal={140} />
              )}
              {eyeData.length >= 2 && (
                <SparkLine data={eyeData} dataKey="eye" color="#22c55e" label="Eye Contact" unit="%" refVal={70} />
              )}
              {fillerData.length >= 2 && (
                <SparkLine data={fillerData} dataKey="filler" color="#f59e0b" label="Filler Words" />
              )}
              {postureData.length >= 2 && (
                <SparkLine data={postureData} dataKey="posture" color="#a78bfa" label="Posture Score" unit="/100" refVal={70} />
              )}
            </div>
          </div>
        </>
      )}

      {/* IMP-01: Learning path recommendation based on session history */}
      {userId && <LearningPathPanel studentId={userId} />}
    </div>
  )
}
