'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, CheckCircle } from 'lucide-react'

interface Report {
  band_score: number | null
  wpm_avg: number | null
  eye_contact_pct: number | null
  posture_score: number | null
  filler_count: number | null
  transcript: string | null
  advice_cards: { impact: string; text: string }[] | null
}

interface Override {
  override_band: number
  feedback: string
  created_at: string
}

interface Submission {
  id: string
  student_id: string
  status: string
  session_mode: string
  uploaded_at: string
  users: { full_name: string; email: string }
  feedback_reports: Report | Report[] | null
  educator_overrides: Override | Override[] | null
  assignments: { title: string } | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function postureLabel(s: number | null) {
  if (s == null) return 'N/A'
  if (s >= 80) return 'Excellent'
  if (s >= 60) return 'Good'
  if (s >= 40) return 'Fair'
  return 'Poor'
}

const BAND_OPTIONS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]

export default function SubmissionReviewPage() {
  const { id: courseId, sid: presentationId } = useParams<{ id: string; sid: string }>()

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // HITL override form
  const [overrideBand, setOverrideBand] = useState<number>(4.0)
  const [overrideFeedback, setOverrideFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [overrideSuccess, setOverrideSuccess] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { user } } = await sb.auth.getUser()
      if (user) setUserId(user.id)

      try {
        const res = await fetch(`${API_URL}/api/submissions/${presentationId}`)
        if (res.ok) {
          const data = await res.json()
          setSubmission(data.submission)
          setVideoUrl(data.video_signed_url)

          // Pre-fill override band with current AI band score
          const rep = Array.isArray(data.submission.feedback_reports)
            ? data.submission.feedback_reports[0]
            : data.submission.feedback_reports
          if (rep?.band_score != null) setOverrideBand(Math.round(rep.band_score * 2) / 2)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [presentationId])

  async function handleOverride() {
    if (!userId || !overrideFeedback.trim()) return
    setSubmitting(true)
    setOverrideError(null)
    try {
      const res = await fetch(`${API_URL}/api/submissions/${presentationId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          educator_id: userId,
          override_band: overrideBand,
          feedback: overrideFeedback.trim(),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Override failed')
      }
      setOverrideSuccess(true)
    } catch (err: unknown) {
      setOverrideError(err instanceof Error ? err.message : 'Override failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-[#55556a] text-sm">Loading submission...</div>
  if (!submission) return <div className="p-6 text-[#ef4444] text-sm">Submission not found.</div>

  const report: Report | null = Array.isArray(submission.feedback_reports)
    ? submission.feedback_reports[0] ?? null
    : submission.feedback_reports

  const existingOverride: Override | null = Array.isArray(submission.educator_overrides)
    ? submission.educator_overrides[0] ?? null
    : submission.educator_overrides

  const IMPACT_VARIANT = { HIGH: 'red', MED: 'amber', LOW: 'blue' } as const

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/educator/courses/${courseId}`}>
          <button className="mt-1 text-[#55556a] hover:text-[#8888a0] transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex-1">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 4 }}>
            SUBMISSION REVIEW
          </div>
          <h1 className="text-xl font-semibold text-[#e8e8f0]">{submission.users?.full_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-[#55556a]">{submission.users?.email}</span>
            {submission.assignments && <span className="text-xs text-[#55556a]">· {submission.assignments.title}</span>}
            <Badge variant={submission.status === 'complete' ? 'green' : submission.status === 'failed' ? 'red' : 'amber'}>
              {submission.status}
            </Badge>
            {existingOverride && <Badge variant="purple">Overridden</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Left: video + metrics */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Video player */}
          <div className="rounded-xl border overflow-hidden" style={{ background: '#000', borderColor: 'rgba(255,255,255,0.06)' }}>
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="w-full"
                style={{ maxHeight: 320, background: '#000' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <span className="text-[#55556a] text-sm">Video not available for remote review.</span>
                <span className="text-[#3a3a52] text-xs">Configure Supabase Storage (T4.06) to enable video playback.</span>
              </div>
            )}
          </div>

          {/* AI Metrics */}
          {report && (
            <div className="flex flex-col gap-4 rounded-xl border p-4" style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#55556a' }}>
                AI ANALYSIS
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Band Score', value: report.band_score != null ? report.band_score.toFixed(1) : '—', color: '#8b5cf6' },
                  { label: 'Avg WPM', value: report.wpm_avg != null ? Math.round(report.wpm_avg) : '—', color: '#94a3b8' },
                  { label: 'Eye Contact', value: report.eye_contact_pct != null ? `${Math.round(report.eye_contact_pct)}%` : '—', color: '#22c55e' },
                  { label: 'Posture', value: postureLabel(report.posture_score), color: '#f59e0b' },
                  { label: 'Filler Words', value: report.filler_count ?? '—', color: '#f59e0b' },
                  { label: 'Session Mode', value: submission.session_mode || '—', color: '#55556a' },
                ].map((m) => (
                  <div key={m.label} className="flex flex-col gap-0.5 rounded-lg border p-2.5"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#55556a' }}>{m.label}</span>
                    <span className="font-mono text-base font-semibold" style={{ color: m.color }}>{String(m.value)}</span>
                  </div>
                ))}
              </div>

              {/* Transcript */}
              {report.transcript && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#55556a', marginBottom: 8 }}>
                    TRANSCRIPT
                  </div>
                  <p className="text-[#8888a0] text-xs leading-6 max-h-36 overflow-y-auto">
                    {report.transcript.split(/(\[[^\]]+\])/).map((part, i) =>
                      /^\[.+\]$/.test(part) ? (
                        <mark key={i} className="rounded px-0.5 not-italic" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                          {part.slice(1, -1)}
                        </mark>
                      ) : part
                    )}
                  </p>
                </div>
              )}

              {/* Advice cards */}
              {report.advice_cards && report.advice_cards.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#55556a', marginBottom: 8 }}>
                    AI INSIGHTS
                  </div>
                  {report.advice_cards.slice(0, 3).map((card, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border p-2.5 mb-2"
                      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <p className="flex-1 text-xs text-[#8888a0]">{card.text}</p>
                      <Badge variant={IMPACT_VARIANT[card.impact as keyof typeof IMPACT_VARIANT] || 'blue'}>{card.impact}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: HITL override */}
        <div className="col-span-2 flex flex-col gap-4">
          <div
            className="flex flex-col gap-4 rounded-xl border p-4 sticky top-4"
            style={{ background: 'rgba(14,14,22,0.55)', borderColor: overrideSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between">
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#55556a' }}>
                HITL OVERRIDE
              </div>
              {existingOverride && (
                <Badge variant="green">Previously overridden</Badge>
              )}
            </div>

            {overrideSuccess ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle size={28} style={{ color: '#22c55e' }} />
                <p className="text-sm text-[#22c55e] font-semibold">Override saved successfully.</p>
                <p className="text-xs text-[#55556a] text-center">
                  Band score updated to <strong className="text-[#e8e8f0]">{overrideBand}</strong>. The student&apos;s results page will reflect this change.
                </p>
              </div>
            ) : (
              <>
                {existingOverride && (
                  <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.04)', color: '#22c55e' }}>
                    Previous override: Band <strong>{existingOverride.override_band}</strong>
                  </div>
                )}

                {/* Band selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#8888a0]">
                    Override Band Score
                    <span className="ml-2 font-mono text-[#f59e0b]">{overrideBand.toFixed(1)}</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BAND_OPTIONS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setOverrideBand(b)}
                        className="rounded-md py-1.5 text-xs font-mono font-semibold transition-all"
                        style={{
                          background: overrideBand === b ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${overrideBand === b ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.06)'}`,
                          color: overrideBand === b ? '#f59e0b' : '#55556a',
                        }}
                      >
                        {b.toFixed(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[#3a3a52] text-xs">
                    AI band: <strong className="text-[#55556a]">{report?.band_score != null ? report.band_score.toFixed(1) : '—'}</strong>
                  </p>
                </div>

                {/* Feedback */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#8888a0]">Written Feedback *</label>
                  <textarea
                    value={overrideFeedback}
                    onChange={(e) => setOverrideFeedback(e.target.value)}
                    placeholder="Provide your assessment rationale and personalised advice for the student..."
                    rows={6}
                    className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[#3a3a52] resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#e8e8f0' }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                </div>

                {overrideError && <p className="text-xs text-[#ef4444]">{overrideError}</p>}

                <Button
                  onClick={handleOverride}
                  disabled={submitting || !overrideFeedback.trim()}
                >
                  {submitting ? 'Saving...' : 'Save Override →'}
                </Button>

                <p className="text-[#3a3a52] text-xs">
                  Overrides update the student&apos;s band score immediately. An audit trail is kept in <code>educator_overrides</code>.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
