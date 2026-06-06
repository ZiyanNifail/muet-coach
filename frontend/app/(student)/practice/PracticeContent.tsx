'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { TopicWheel } from '@/components/TopicWheel'
import { BrainstormPanel } from '@/components/BrainstormPanel'
import { RecordingInterface } from '@/components/RecordingInterface'
import { SessionPrep, type PrepResult } from '@/components/SessionPrep'
import { SpeakingPrepStep } from '../exam/components/SpeakingPrepStep'
import { AlertTriangle, Mic, Mic2, CalendarClock, X, FileText, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProcessing } from '@/lib/processingContext'
import { useNavigationGuard } from '@/lib/navGuard'

type Step = 'mode' | 'topic' | 'brainstorm' | 'slides' | 'prep' | 'examPrep' | 'recording' | 'processing'
type Mode = 'unguided' | 'guided'

const MODE_OPTIONS = [
  {
    mode: 'unguided' as Mode,
    title: 'UNGUIDED SESSION',
    desc: 'Baseline analysis. AI evaluates only after session ends. No interruptions during recording.',
    color: '#6b7280',
    badge: null as string | null,
    icon: Mic,
    features: ['No coaching interruptions', 'Full AI analysis at the end', 'Natural baseline recording'],
    buttonLabel: 'Start Session',
  },
  {
    mode: 'guided' as Mode,
    title: 'GUIDED SESSION',
    desc: 'Real-time coaching. Warnings fire when you speak too fast, too slow, or lose eye contact.',
    color: '#22c55e',
    badge: 'RECOMMENDED' as string | null,
    icon: Mic2,
    features: ['Filler word alerts (um, uh, er...)', 'Live pace coaching (90—160 WPM)', 'Eye contact reminders every 45 s'],
    buttonLabel: 'Start Session',
  },
]

interface Topic {
  id: string
  topic: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 60

function checkBandwidth(): boolean {
  try {
    const nav = navigator as Navigator & { connection?: { downlink?: number } }
    const downlink = nav.connection?.downlink
    if (downlink !== undefined && downlink < 2) return false
  } catch {}
  return true
}

// -- Slide Upload Step --------------------------------------------------------
function SlideUploadStep({
  onContinue,
  onSkip,
  onClose,
  required = false,
}: {
  onContinue: (file: File | null) => void
  onSkip: () => void
  onClose?: () => void
  required?: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ACCEPTED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']

  function handleFile(f: File) {
    const ok = ACCEPTED.includes(f.type) || f.name.endsWith('.pdf') || f.name.endsWith('.pptx')
    if (!ok) { alert('Only PDF or PPTX files are accepted.'); return }
    if (f.size > 20 * 1024 * 1024) { alert('File must be under 20 MB.'); return }
    setFile(f)
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 flex items-center justify-center w-8 h-8 rounded-full transition-colors"
          style={{ background: 'rgba(180,165,148,0.15)', color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(180,165,148,0.30)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(180,165,148,0.15)')}
        >
          <X size={16} />
        </button>
      )}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
          SLIDES {required ? '(REQUIRED)' : '(OPTIONAL)'}
        </div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Upload your slide deck</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          PDF or PPTX · Max 20 MB{required ? ' · Required for this assignment' : ' · Optional — skip if not needed'}
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 transition-colors"
        style={{
          borderColor: dragging ? '#94a3b8' : file ? '#22c55e' : required ? 'rgba(245,158,11,0.35)' : 'rgba(180,165,148,0.35)',
          background: dragging ? 'rgba(148,163,184,0.05)' : 'rgba(180,165,148,0.04)',
          cursor: 'pointer',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileText size={32} style={{ color: '#22c55e' }} />
            <span className="text-sm text-[var(--text-primary)] font-semibold">{file.name}</span>
            <span className="text-xs text-[var(--text-tertiary)]">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            <button
              className="flex items-center gap-1 text-xs text-[#ef4444] hover:underline"
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
            >
              <X size={12} /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            <Upload size={28} style={{ color: 'var(--text-tertiary)' }} />
            <div className="text-center">
              <p className="text-sm text-[var(--text-secondary)]">Drag and drop your PDF or PPTX here</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">or click to browse</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => onContinue(file)} disabled={required ? !file : false} className="min-h-[44px]">
          Continue with slides
        </Button>
        {!required && <Button variant="ghost" onClick={onSkip} className="min-h-[44px]">Skip</Button>}
      </div>
    </div>
  )
}

interface AssignmentInfo {
  id: string
  title: string
  description: string
  exam_mode: boolean
  slide_required: boolean
  deadline: string | null
  exam_topic_id: string | null
  exam_duration_mins: number | null
  scheduled_at: string | null
}

// -- Main PracticeContent -----------------------------------------------------

export function PracticeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const assignmentIdParam = searchParams.get('assignment_id')
  const initialMode = searchParams.get('mode') as Mode | null

  // Always initialise with defaults — avoids SSR/client attribute mismatch when
  // searchParams differ between server render and client hydration.
  const [step, setStep] = useState<Step>('mode')
  const [mode, setMode] = useState<Mode>('unguided')
  // MUET Task A exam conditions: 2-min prep timer + 2-min timed recording, no pausing,
  // no AI brainstorm. Only meaningful with the unguided baseline mode.
  const [examConditions, setExamConditions] = useState(false)

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode)
      if (initialMode === 'unguided' && searchParams.get('exam') === '1') setExamConditions(true)
      setStep('topic')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [isExamMode, setIsExamMode] = useState(false)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [lowBandwidth, setLowBandwidth] = useState(false)
  const [notes, setNotes] = useState('')
  const [sessionAiPoints, setSessionAiPoints] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<'uploading' | 'analysing' | 'done'>('uploading')
  const [pipelineStage, setPipelineStage] = useState(0)
  const [assignmentInfo, setAssignmentInfo] = useState<AssignmentInfo | null>(null)
  const [recordingKey, setRecordingKey] = useState(0)
  const [slideFile, setSlideFile] = useState<File | null>(null)
  const [prepResult, setPrepResult] = useState<PrepResult | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [uploadFailed, setUploadFailed] = useState(false)
  const blobRef = useRef<Blob | null>(null)
  const durationRef = useRef<number>(0)
  const currentPresentationIdRef = useRef<string | null>(null)
  const { addJob } = useProcessing()
  useNavigationGuard(step !== 'mode' && step !== 'processing', 'your session')

  useEffect(() => {
    if (processingStatus !== 'analysing') return
    setPipelineStage(1)
    const t1 = setTimeout(() => setPipelineStage(2), 18000)
    const t2 = setTimeout(() => setPipelineStage(3), 42000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [processingStatus])

  // When arriving from an assignment link, fetch assignment details and fast-forward the flow
  useEffect(() => {
    if (!assignmentIdParam) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const authHdr: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
      try {
        const res = await fetch(`${API_URL}/api/courses/assignment/${assignmentIdParam}`, { headers: authHdr })
        if (!res.ok) return
        const data = await res.json()
        const a: AssignmentInfo = data.assignment
        setAssignmentInfo(a)
        setMode('unguided')

        if (a.exam_mode) {
          setIsExamMode(true)
          // Resolve exam topic text: look up muet_topics if exam_topic_id is set
          let topicText = a.title
          if (a.exam_topic_id) {
            try {
              const { data: t } = await supabase
                .from('muet_topics')
                .select('id, topic')
                .eq('id', a.exam_topic_id)
                .single()
              if (t?.topic) topicText = t.topic
            } catch {}
          }
          setTopic({ id: a.exam_topic_id || 'exam', topic: topicText })
          setStep('brainstorm')
        } else {
          setStep(a.slide_required ? 'slides' : 'prep')
        }
      } catch {}
    })
  }, [assignmentIdParam])

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [])

  function goBack() { router.push('/dashboard') }

  function handleModeSelect(m: Mode) {
    if (m !== 'unguided') setExamConditions(false)  // exam conditions only pair with the baseline mode
    setMode(m)
    setStep('topic')
  }

  function handleTopicSelect(t: Topic) {
    setTopic(t)
    // Exam conditions skip the AI brainstorm step (not exam-realistic) — go straight to tech check.
    setStep(examConditions ? 'prep' : 'brainstorm')
  }

  function handleBrainstormReady(n: string, pts?: string[]) { setNotes(n); setSessionAiPoints(pts || []); setStep('prep') }

  async function handleRecordingComplete(blob: Blob, durationSecs: number) {
    blobRef.current = blob
    durationRef.current = durationSecs
    currentPresentationIdRef.current = null
    setStep('processing')
    setProcessingStatus('uploading')
    setUploadError(null)
    setUploadFailed(false)

    if (!checkBandwidth()) setLowBandwidth(true)

    let studentId = 'anonymous'
    let authToken = ''
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) studentId = session.user.id
      if (session?.access_token) authToken = session.access_token
    } catch {}

    const delays = [5000, 10000, 20000]
    let presentationId: string | null = null

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const formData = new FormData()
        formData.append('video', blob, 'recording.webm')
        formData.append('student_id', studentId)
        formData.append('session_mode', (isExamMode || examConditions) ? 'exam' : mode)
        formData.append('duration_secs', String(Math.round(durationSecs)))
        if (prepResult) {
          formData.append('prep_passed', String(prepResult.passed))
          formData.append('ambient_db', String(prepResult.ambientDb))
          formData.append('speaking_db', String(prepResult.speakingDb))
        }
        if (assignmentIdParam) formData.append('assignment_id', assignmentIdParam)
        if (topic) {
          formData.append('topic_id', topic.id)
          formData.append('topic_text', topic.topic)
        } else if (assignmentInfo) {
          formData.append('topic_text', assignmentInfo.title)
        }
        if (slideFile) {
          formData.append('slides', slideFile, slideFile.name)
        }

        const result = await uploadWithProgress(
          `${API_URL}/api/presentations/upload`,
          formData,
          (pct) => setUploadProgress(pct),
          authToken,
        )
        presentationId = result.presentation_id
        currentPresentationIdRef.current = presentationId
        break
      } catch (err) {
        if (attempt < delays.length) {
          await new Promise((r) => setTimeout(r, delays[attempt]))
        } else {
          const isNetwork = !navigator.onLine || (err instanceof Error && err.message === 'Network error')
          setUploadFailed(true)
          setUploadError(
            isNetwork
              ? 'No internet connection detected. Check your connection and try again.'
              : 'Upload failed after multiple attempts. The server may be temporarily unavailable — try again in a few minutes.'
          )
          return
        }
      }
    }

    if (!presentationId) { router.push('/results/demo'); return }

    setProcessingStatus('analysing')
    let attempts = 0

    function poll() {
      if (attempts >= MAX_POLL_ATTEMPTS) { router.push(`/results/${presentationId}`); return }
      attempts++
      fetch(`${API_URL}/api/presentations/${presentationId}/status`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'complete' || data.status === 'failed') {
            setProcessingStatus('done')
            router.push(`/results/${presentationId}`)
          } else {
            pollRef.current = setTimeout(poll, POLL_INTERVAL_MS)
          }
        })
        .catch(() => { pollRef.current = setTimeout(poll, POLL_INTERVAL_MS) })
    }
    poll()
  }

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-48px)]">
      {/* Assignment context banner */}
      {assignmentInfo && (
        <div className="mx-4 md:mx-6 mt-4 rounded-lg border px-4 py-3 flex items-start gap-3"
          style={{
            background: assignmentInfo.exam_mode ? 'rgba(58,125,106,0.06)' : 'rgba(245,158,11,0.06)',
            borderColor: assignmentInfo.exam_mode ? 'rgba(58,125,106,0.25)' : 'rgba(245,158,11,0.25)',
          }}>
          {assignmentInfo.exam_mode
            ? <CalendarClock size={14} style={{ color: 'var(--accent-teal)', flexShrink: 0, marginTop: 1 }} />
            : <FileText size={14} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: 1 }} />
          }
          <div>
            <span className="text-xs font-semibold" style={{ color: assignmentInfo.exam_mode ? 'var(--accent-teal)' : 'var(--accent-amber)' }}>
              {assignmentInfo.exam_mode ? 'MUET Mock Exam: ' : 'Assignment: '}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{assignmentInfo.title}</span>
            {assignmentInfo.exam_mode && assignmentInfo.scheduled_at && (
              <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>
                · {new Date(assignmentInfo.scheduled_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
            {assignmentInfo.exam_mode && assignmentInfo.exam_duration_mins && (
              <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>· {assignmentInfo.exam_duration_mins} min</span>
            )}
            {!assignmentInfo.exam_mode && assignmentInfo.deadline && (
              <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>
                · Due {new Date(assignmentInfo.deadline).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Step: Mode selector */}
      {step === 'mode' && (
        <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl relative">
          <button
            onClick={goBack}
            className="absolute top-6 right-6 flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
          >
            <X size={16} />
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
              PRACTICE
            </div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Choose session mode</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Select how you want to practise today.</p>
          </div>
          <div className="flex flex-col gap-3">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              return (
                <div
                  key={opt.mode}
                  className="flex flex-col gap-4 p-4 md:p-5 rounded-xl border cursor-pointer"
                  style={{
                    background: `rgba(${opt.mode === 'unguided' ? '80,80,96' : opt.mode === 'guided' ? '34,197,94' : '245,158,11'}, 0.05)`,
                    borderColor: opt.color + '40',
                  }}
                  onClick={() => handleModeSelect(opt.mode)}
                >
                  {/* Top row: icon + title + badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: opt.color + '18', border: `1px solid ${opt.color}40` }}
                      >
                        <Icon size={18} style={{ color: opt.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: opt.color }}>
                          {opt.title}
                        </div>
                        <p className="text-sm mt-0.5 leading-5 max-w-lg" style={{ color: 'var(--text-secondary)' }}>{opt.desc}</p>
                      </div>
                    </div>
                    {opt.badge && (
                      <span
                        className="flex-shrink-0 text-[9px] font-bold tracking-[0.12em] px-2 py-0.5 rounded"
                        style={{ background: opt.color + '18', color: opt.color, border: `1px solid ${opt.color}40` }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>

                  {/* Exam-conditions toggle — unguided only (MUET Task A) */}
                  {opt.mode === 'unguided' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setExamConditions(v => !v) }}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
                      style={{
                        background: examConditions ? 'rgba(245,158,11,0.08)' : 'rgba(180,165,148,0.04)',
                        borderColor: examConditions ? 'rgba(245,158,11,0.45)' : 'rgba(180,165,148,0.2)',
                      }}
                    >
                      <span
                        className="relative flex-shrink-0 rounded-full transition-colors"
                        style={{ width: 34, height: 20, background: examConditions ? '#f59e0b' : 'rgba(180,165,148,0.4)' }}
                      >
                        <span
                          className="absolute top-0.5 rounded-full bg-white transition-all"
                          style={{ width: 16, height: 16, left: examConditions ? 16 : 2 }}
                        />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-xs font-semibold" style={{ color: examConditions ? '#d97706' : 'var(--text-secondary)' }}>
                          MUET exam conditions
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          2 min prep · 2 min timed · no pausing · no AI help
                        </span>
                      </span>
                    </button>
                  )}

                  {/* Bottom row: features + button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 sm:pl-13">
                    <div className="flex gap-3 flex-wrap">
                      {opt.features.map(f => (
                        <div key={f} className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: opt.color, opacity: 0.6 }} />
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={(e) => { e.stopPropagation(); handleModeSelect(opt.mode) }} className="min-h-[44px] w-full sm:w-auto">
                      {opt.buttonLabel}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step: Topic wheel */}
      {step === 'topic' && (
        <>
          <div className="p-4 md:p-6">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
              PRACTICE · {mode.toUpperCase()}
            </div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Selecting your topic...</h1>
          </div>
          <TopicWheel onSelect={handleTopicSelect} onClose={goBack} />
        </>
      )}

      {/* Step: Brainstorm panel (unguided / guided only) */}
      {step === 'brainstorm' && topic && (
        <>
          <div className="p-4 md:p-6">
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Brainstorm</h1>
          </div>
          <BrainstormPanel topic={topic.topic} onReady={handleBrainstormReady} onSkip={() => setStep('prep')} onClose={goBack} hideAI={mode === 'unguided'} />
        </>
      )}

      {/* Step: Slide upload */}
      {step === 'slides' && (
        <SlideUploadStep
          required={assignmentInfo?.slide_required ?? false}
          onContinue={(file) => { setSlideFile(file); setStep('prep') }}
          onSkip={() => setStep('prep')}
          onClose={goBack}
        />
      )}

      {/* Step: Session prep (mic + framing) */}
      {step === 'prep' && (
        <SessionPrep
          onReady={(r) => { setPrepResult(r); setStep(examConditions ? 'examPrep' : 'recording') }}
          onSkip={() => { setPrepResult({ passed: false, speakingDb: 0, ambientDb: 0, framingOk: false }); setStep(examConditions ? 'examPrep' : 'recording') }}
        />
      )}

      {/* Step: Exam prep timer (MUET Task A — 2 min to plan, then auto-records) */}
      {step === 'examPrep' && (topic || assignmentInfo) && (
        <SpeakingPrepStep
          topic={topic?.topic ?? assignmentInfo?.title ?? ''}
          onReady={() => setStep('recording')}
        />
      )}

      {/* Step: Recording */}
      {step === 'recording' && (topic || assignmentInfo) && (
        <RecordingInterface
          key={recordingKey}
          topic={topic?.topic ?? assignmentInfo?.title ?? ''}
          mode={examConditions ? 'exam' : mode}
          maxSecs={examConditions ? 120 : (assignmentInfo?.exam_mode && assignmentInfo.exam_duration_mins ? assignmentInfo.exam_duration_mins * 60 : 300)}
          notes={examConditions ? undefined : (notes || undefined)}
          aiPoints={(examConditions || mode === 'unguided') ? undefined : (sessionAiPoints.length > 0 ? sessionAiPoints : undefined)}
          onComplete={handleRecordingComplete}
          onCancel={(action) => {
            if (action === 'restart') {
              setRecordingKey(k => k + 1)
            } else {
              router.push('/dashboard')
            }
          }}
        />
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div
            className="max-w-sm w-full flex flex-col gap-5 rounded-xl border p-8"
            style={{ background: 'var(--bg-panel)', borderColor: uploadFailed ? 'rgba(239,68,68,0.25)' : 'var(--border-subtle)' }}
          >
            {uploadFailed ? (
              <>
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 6 }}>
                      UPLOAD FAILED
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {uploadError}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleRecordingComplete(blobRef.current!, durationRef.current)}
                    className="min-h-[44px]"
                  >
                    Retry Upload
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => { setStep('recording'); setUploadFailed(false); setUploadError(null) }}
                    className="min-h-[44px]"
                  >
                    Record Again
                  </Button>
                  <Button variant="ghost" onClick={() => router.push('/dashboard')} className="min-h-[44px]">
                    Go to Dashboard
                  </Button>
                </div>
              </>
            ) : (
              <>
                {lowBandwidth && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706' }}>
                    <AlertTriangle size={13} />
                    <span>Slow connection detected — upload may take longer</span>
                  </div>
                )}

                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                    PROCESSING
                  </p>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {processingStatus === 'uploading' ? 'Uploading your session…' : 'Analysing your session…'}
                  </h2>
                </div>

                {processingStatus === 'uploading' && (
                  <div className="flex flex-col gap-2">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-medium)' }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: 'var(--accent-teal)' }} />
                    </div>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{uploadProgress}%</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Uploading video',         done: processingStatus !== 'uploading', active: processingStatus === 'uploading' },
                    { label: 'Transcribing audio',      done: pipelineStage > 1,               active: pipelineStage === 1 },
                    { label: 'Analysing body language', done: pipelineStage > 2,               active: pipelineStage === 2 },
                    { label: 'Generating feedback',     done: false,                            active: pipelineStage === 3 },
                  ].map(({ label, done, active }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: done ? 'rgba(58,125,106,0.12)' : active ? 'rgba(58,125,106,0.08)' : 'rgba(180,165,148,0.12)',
                          border: `1px solid ${done ? 'rgba(58,125,106,0.35)' : active ? 'rgba(58,125,106,0.25)' : 'rgba(180,165,148,0.20)'}`,
                        }}
                      >
                        {done ? (
                          <span style={{ color: '#3A7D6A', fontSize: 10, fontWeight: 700 }}>✓</span>
                        ) : active ? (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3A7D6A', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        ) : (
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(180,165,148,0.45)', display: 'inline-block' }} />
                        )}
                      </div>
                      <span className="text-sm" style={{ color: done ? 'var(--accent-teal)' : active ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: active ? 500 : 400 }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {processingStatus === 'analysing' && currentPresentationIdRef.current && (
                  <button
                    onClick={() => {
                      addJob(currentPresentationIdRef.current!, topic?.topic ?? assignmentInfo?.title ?? '')
                      router.push('/dashboard')
                    }}
                    className="text-sm font-medium self-start transition-opacity hover:opacity-70"
                    style={{ color: 'var(--accent-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Continue exploring →
                  </button>
                )}

                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {processingStatus === 'uploading'
                    ? 'Upload may take a moment on slow connections.'
                    : "Analysis takes 1–3 minutes — you'll get a notification when it's done."}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void,
  authToken?: string,
): Promise<{ presentation_id: string; status: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)) }
        catch { reject(new Error('Invalid JSON response')) }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText.slice(0, 200)}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.ontimeout = () => reject(new Error('Upload timeout'))
    xhr.timeout = 5 * 60 * 1000
    xhr.send(formData)
  })
}
