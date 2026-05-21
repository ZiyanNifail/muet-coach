'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, CheckCircle, Send } from 'lucide-react'

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
  grade_percent: number | null
  grade_letter: string | null
  presentation_accuracy_score: number | null
  presentation_accuracy_notes: string | null
  released_at: string | null
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

function percentToLetter(p: number): string {
  if (p >= 90) return 'A+'
  if (p >= 80) return 'A'
  if (p >= 75) return 'A-'
  if (p >= 70) return 'B+'
  if (p >= 65) return 'B'
  if (p >= 60) return 'B-'
  if (p >= 55) return 'C+'
  if (p >= 50) return 'C'
  if (p >= 40) return 'D'
  return 'F'
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
  const [gradeReleased, setGradeReleased] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // HITL override form
  const [overrideBand, setOverrideBand] = useState<number>(4.0)
  const [overrideFeedback, setOverrideFeedback] = useState('')
  const [gradePercent, setGradePercent] = useState<string>('')
  const [accuracyScore, setAccuracyScore] = useState<string>('')
  const [accuracyNotes, setAccuracyNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [releaseSuccess, setReleaseSuccess] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      try {
        const authHdr = await getAuthHeaders()
        const res = await fetch(`${API_URL}/api/submissions/${presentationId}`, { headers: authHdr })
        if (res.ok) {
          const data = await res.json()
          setSubmission(data.submission)
          setVideoUrl(data.video_signed_url)
          setGradeReleased(data.grade_released ?? false)

          const rep = Array.isArray(data.submission.feedback_reports)
            ? data.submission.feedback_reports[0]
            : data.submission.feedback_reports
          if (rep?.band_score != null) setOverrideBand(Math.round(rep.band_score * 2) / 2)

          // Pre-fill from existing draft if present
          const overrides = data.submission.educator_overrides ?? []
          const latest: Override | undefined = Array.isArray(overrides) ? overrides[0] : overrides
          if (latest) {
            setOverrideBand(latest.override_band)
            setOverrideFeedback(latest.feedback ?? '')
            if (latest.grade_percent != null) setGradePercent(String(latest.grade_percent))
            if (latest.presentation_accuracy_score != null) setAccuracyScore(String(latest.presentation_accuracy_score))
            if (latest.presentation_accuracy_notes) setAccuracyNotes(latest.presentation_accuracy_notes)
            if (latest.released_at) setDraftSaved(true)
          }
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [presentationId])

  async function handleSaveDraft() {
    if (!userId || !overrideFeedback.trim()) return
    setSubmitting(true)
    setOverrideError(null)
    try {
      const pct = gradePercent !== '' ? parseFloat(gradePercent) : null
      if (pct !== null && (pct < 0 || pct > 100)) throw new Error('Percentage must be 0–100.')
      const acc = accuracyScore !== '' ? parseFloat(accuracyScore) : null
      if (acc !== null && (acc < 0 || acc > 100)) throw new Error('Accuracy score must be 0–100.')
      const authHdr = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/submissions/${presentationId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify({
          educator_id: userId,
          override_band: overrideBand,
          feedback: overrideFeedback.trim(),
          grade_percent: pct,
          presentation_accuracy_score: acc,
          presentation_accuracy_notes: accuracyNotes.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Save failed')
      }
      setDraftSaved(true)
    } catch (err: unknown) {
      setOverrideError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRelease() {
    setReleasing(true)
    setOverrideError(null)
    try {
      const authHdr = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/submissions/${presentationId}/release`, {
        method: 'POST',
        headers: authHdr,
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Release failed')
      }
      setReleaseSuccess(true)
      setGradeReleased(true)
    } catch (err: unknown) {
      setOverrideError(err instanceof Error ? err.message : 'Release failed.')
    } finally {
      setReleasing(false)
    }
  }

  if (loading) return <div className="p-4 md:p-6 text-[#9B8E80] text-sm">Loading submission...</div>
  if (!submission) return <div className="p-4 md:p-6 text-[#ef4444] text-sm">Submission not found.</div>

  const report: Report | null = Array.isArray(submission.feedback_reports)
    ? submission.feedback_reports[0] ?? null
    : submission.feedback_reports

  const IMPACT_VARIANT = { HIGH: 'red', MED: 'amber', LOW: 'blue' } as const

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/educator/courses/${courseId}`}>
          <button className="mt-1 text-[#9B8E80] hover:text-[#6B6050] transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex-1">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80', marginBottom: 4 }}>
            SUBMISSION REVIEW
          </div>
          <h1 className="text-xl font-semibold text-[#1C1A17]">{submission.users?.full_name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="text-xs text-[#9B8E80]">{submission.users?.email}</span>
            {submission.assignments && <span className="text-xs text-[#9B8E80]">· {submission.assignments.title}</span>}
            <Badge variant={submission.status === 'complete' ? 'green' : submission.status === 'failed' ? 'red' : 'amber'}>
              {submission.status}
            </Badge>
            {gradeReleased && <Badge variant="purple">Grade released</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: video + metrics */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Video player */}
          <div className="rounded-xl border overflow-hidden" style={{ background: '#000', borderColor: 'rgba(180,165,148,0.22)' }}>
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="w-full"
                style={{ maxHeight: 320, background: '#000' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <span className="text-[#9B8E80] text-sm">Video not available for remote review.</span>
                <span className="text-[#C4B8A8] text-xs">Configure Supabase Storage (T4.06) to enable video playback.</span>
              </div>
            )}
          </div>

          {/* AI Metrics */}
          {report && (
            <div className="flex flex-col gap-4 rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9B8E80' }}>
                AI ANALYSIS
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Band Score', value: report.band_score != null ? report.band_score.toFixed(1) : '—', color: '#8b5cf6' },
                  { label: 'Avg WPM', value: report.wpm_avg != null ? Math.round(report.wpm_avg) : '—', color: '#94a3b8' },
                  { label: 'Eye Contact', value: report.eye_contact_pct != null ? `${Math.round(report.eye_contact_pct)}%` : '—', color: '#22c55e' },
                  { label: 'Posture', value: postureLabel(report.posture_score), color: '#f59e0b' },
                  { label: 'Filler Words', value: report.filler_count ?? '—', color: '#f59e0b' },
                  { label: 'Session Mode', value: submission.session_mode || '—', color: '#9B8E80' },
                ].map((m) => (
                  <div key={m.label} className="flex flex-col gap-0.5 rounded-lg border p-2.5"
                    style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.22)' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#9B8E80' }}>{m.label}</span>
                    <span className="font-mono text-base font-semibold" style={{ color: m.color }}>{String(m.value)}</span>
                  </div>
                ))}
              </div>

              {/* Transcript */}
              {report.transcript && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9B8E80', marginBottom: 8 }}>
                    TRANSCRIPT
                  </div>
                  <p className="text-[#6B6050] text-xs leading-6 max-h-36 overflow-y-auto">
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
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9B8E80', marginBottom: 8 }}>
                    AI INSIGHTS
                  </div>
                  {report.advice_cards.slice(0, 3).map((card, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border p-2.5 mb-2"
                      style={{ background: 'rgba(180,165,148,0.06)', borderColor: 'rgba(180,165,148,0.22)' }}>
                      <p className="flex-1 text-xs text-[#6B6050]">{card.text}</p>
                      <Badge variant={IMPACT_VARIANT[card.impact as keyof typeof IMPACT_VARIANT] || 'blue'}>{card.impact}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: HITL override */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div
            className="flex flex-col gap-4 rounded-xl border p-4 lg:sticky lg:top-4"
            style={{ background: 'rgba(245,242,237,0.95)', borderColor: releaseSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(180,165,148,0.22)' }}
          >
            <div className="flex items-center justify-between">
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9B8E80' }}>
                GRADE
              </div>
              {gradeReleased
                ? <Badge variant="green">Released to student</Badge>
                : draftSaved
                  ? <Badge variant="amber">Draft saved</Badge>
                  : null}
            </div>

            {releaseSuccess ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle size={28} style={{ color: '#22c55e' }} />
                <p className="text-sm text-[#22c55e] font-semibold">Grade released to student.</p>
                <p className="text-xs text-[#9B8E80] text-center">
                  Band <strong className="text-[#1C1A17]">{overrideBand.toFixed(1)}</strong>
                  {gradePercent !== '' && <> · {gradePercent}% ({percentToLetter(parseFloat(gradePercent))})</>}
                </p>
              </div>
            ) : (
              <>
                {/* Band selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#6B6050]">
                    MUET Band
                    <span className="ml-2 font-mono text-[#f59e0b]">{overrideBand.toFixed(1)}</span>
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {BAND_OPTIONS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setOverrideBand(b)}
                        className="rounded-md py-1.5 text-xs font-mono font-semibold transition-all"
                        style={{
                          background: overrideBand === b ? 'rgba(245,158,11,0.2)' : 'rgba(180,165,148,0.08)',
                          border: `1px solid ${overrideBand === b ? 'rgba(245,158,11,0.5)' : 'rgba(180,165,148,0.22)'}`,
                          color: overrideBand === b ? '#f59e0b' : '#9B8E80',
                        }}
                      >
                        {b.toFixed(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[#C4B8A8] text-xs">
                    AI band: <strong className="text-[#9B8E80]">{report?.band_score != null ? report.band_score.toFixed(1) : '—'}</strong>
                  </p>
                </div>

                {/* University grade */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#6B6050]">
                    University Grade (%)
                    {gradePercent !== '' && !isNaN(parseFloat(gradePercent)) && (
                      <span className="ml-2 font-mono text-[#8b5cf6]">
                        {percentToLetter(parseFloat(gradePercent))}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={gradePercent}
                    onChange={(e) => setGradePercent(e.target.value)}
                    placeholder="e.g. 72"
                    className="rounded-lg border px-3 py-2 text-sm outline-none transition-colors placeholder:text-[#C4B8A8]"
                    style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: '#1C1A17' }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.35)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
                  />
                </div>

                {/* Presentation Accuracy */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#6B6050]">
                    Presentation Accuracy (%)
                    {accuracyScore !== '' && !isNaN(parseFloat(accuracyScore)) && (
                      <span className="ml-2 font-mono" style={{ color: parseFloat(accuracyScore) >= 70 ? '#22c55e' : parseFloat(accuracyScore) >= 50 ? '#f59e0b' : '#ef4444' }}>
                        {parseFloat(accuracyScore).toFixed(0)}%
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={accuracyScore}
                    onChange={e => setAccuracyScore(e.target.value)}
                    placeholder="e.g. 80 — how factually accurate was the content?"
                    className="rounded-lg border px-3 py-2 text-sm outline-none transition-colors placeholder:text-[#C4B8A8]"
                    style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: '#1C1A17' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(34,197,94,0.35)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
                  />
                  <textarea
                    value={accuracyNotes}
                    onChange={e => setAccuracyNotes(e.target.value)}
                    placeholder="Optional: note any factual errors (e.g. 'Incorrect GDP figure cited')"
                    rows={2}
                    className="rounded-lg border px-3 py-2 text-sm outline-none transition-colors placeholder:text-[#C4B8A8] resize-none"
                    style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: '#1C1A17' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(34,197,94,0.35)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
                  />
                </div>

                {/* Feedback */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#6B6050]">Written Feedback *</label>
                  <textarea
                    value={overrideFeedback}
                    onChange={(e) => setOverrideFeedback(e.target.value)}
                    placeholder="Provide your assessment rationale and personalised advice for the student..."
                    rows={5}
                    className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[#C4B8A8] resize-none"
                    style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: '#1C1A17' }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.35)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
                  />
                </div>

                {overrideError && <p className="text-xs text-[#ef4444]">{overrideError}</p>}

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSaveDraft}
                    disabled={submitting || !overrideFeedback.trim()}
                    variant="ghost"
                  >
                    {submitting ? 'Saving...' : draftSaved ? 'Update Draft' : 'Save Draft'}
                  </Button>

                  <button
                    type="button"
                    onClick={handleRelease}
                    disabled={releasing || !draftSaved || gradeReleased}
                    className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
                    style={{
                      background: draftSaved && !gradeReleased ? 'rgba(34,197,94,0.15)' : 'rgba(180,165,148,0.10)',
                      border: `1px solid ${draftSaved && !gradeReleased ? 'rgba(34,197,94,0.4)' : 'rgba(180,165,148,0.22)'}`,
                      color: draftSaved && !gradeReleased ? '#16a34a' : '#C4B8A8',
                      cursor: draftSaved && !gradeReleased ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Send size={14} />
                    {releasing ? 'Releasing...' : gradeReleased ? 'Already released' : submission.session_mode === 'exam' ? 'Finalize Marks' : 'Release Grade to Student'}
                  </button>
                </div>

                <p className="text-[#C4B8A8] text-xs">
                  Save a draft first, then release when ready. Students cannot see the grade until you release it.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
