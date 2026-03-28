'use client'
import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#55556a' }}>
        {label}
      </div>
      <ResponsiveContainer width="100%" height={70}>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: -30 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: 'rgba(14,14,22,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e8f0', fontSize: 11 }}
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
  const [sessions, setSessions] = useState<SessionPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setLoading(false); return }

        const res = await fetch(`${API_URL}/api/reports/history/${user.id}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setSessions(data.sessions || [])
      } catch {
        setError('Could not load progress data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 4 }}>
          PROGRESS
        </div>
        <h1 className="text-2xl font-semibold text-[#e8e8f0]">Band Timeline</h1>
        <p className="text-[#8888a0] text-sm mt-1">Track your CEFR band score and metrics across all sessions.</p>
      </div>

      {/* Summary strip */}
      {hasSessions && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'SESSIONS', value: String(sessions.length), color: '#8b5cf6' },
            { label: 'LATEST BAND', value: latestBand != null ? latestBand.toFixed(1) : '—', color: '#3b82f6' },
            { label: 'IMPROVEMENT', value: improvement != null ? (Number(improvement) >= 0 ? `+${improvement}` : improvement) : '—', color: Number(improvement) >= 0 ? '#22c55e' : '#ef4444' },
          ].map((m) => (
            <div key={m.label} className="flex flex-col gap-1 rounded-lg border p-3"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>{m.label}</span>
              <span className="font-mono text-xl font-semibold" style={{ color: m.color }}>{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Band score timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-48 rounded-xl border" style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-[#55556a] text-sm">Loading progress...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 rounded-xl border" style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[#ef4444] text-sm">{error}</p>
        </div>
      ) : !hasSessions ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl border gap-3" style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[#55556a] text-sm">Complete at least 2 sessions to see your progress trend.</p>
          <Link href="/practice" className="text-[#3b82f6] text-sm hover:underline">Start a session →</Link>
        </div>
      ) : (
        <>
          {/* Main band chart */}
          {bandData.length >= 2 && (
            <div
              className="flex flex-col gap-3 rounded-xl border p-5"
              style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
                BAND SCORE OVER TIME
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bandData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#55556a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#55556a', fontSize: 10 }} axisLine={false} tickLine={false} domain={[1, 6]} ticks={[1, 2, 3, 4, 5, 6]} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(14,14,22,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e8f0', fontSize: 12 }}
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
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 12 }}>
              PER-METRIC TRENDS
            </div>
            <div className="grid grid-cols-2 gap-3">
              {wpmData.length >= 2 && (
                <SparkLine data={wpmData} dataKey="wpm" color="#3b82f6" label="Speaking Pace (WPM)" unit=" wpm" refVal={140} />
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
    </div>
  )
}
