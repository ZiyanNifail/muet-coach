'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { TopicWheel } from '@/components/TopicWheel'
import { BrainstormPanel } from '@/components/BrainstormPanel'
import { RecordingInterface } from '@/components/RecordingInterface'
import { AlertTriangle, Mic, Mic2, CalendarClock, X, FileText, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Step = 'mode' | 'topic' | 'brainstorm' | 'slides' | 'recording' | 'processing'
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

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode)
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
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          setStep(a.slide_required ? 'slides' : 'recording')
        }
      } catch {}
    })
  }, [assignmentIdParam])

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [])

  function goBack() { router.push('/dashboard') }

  function handleModeSelect(m: Mode) {
    setMode(m)
    setStep('topic')
  }

  function handleTopicSelect(t: Topic) {
    setTopic(t)
    setStep('brainstorm')
  }

  function handleBrainstormReady(n: string, pts?: string[]) { setNotes(n); setSessionAiPoints(pts || []); setStep('recording') }

  async function handleRecordingComplete(blob: Blob, durationSecs: number) {
    setStep('processing')
    setProcessingStatus('uploading')
    setUploadError(null)

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
        formData.append('session_mode', isExamMode ? 'exam' : mode)
        formData.append('duration_secs', String(Math.round(durationSecs)))
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
        break
      } catch {
        if (attempt < delays.length) {
          await new Promise((r) => setTimeout(r, delays[attempt]))
        } else {
          setUploadError('Upload failed after 3 attempts. Showing demo results.')
          setTimeout(() => router.push('/results/demo'), 2500)
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
          <BrainstormPanel topic={topic.topic} onReady={handleBrainstormReady} onSkip={() => setStep('recording')} onClose={goBack} hideAI={mode === 'unguided'} />
        </>
      )}

      {/* Step: Slide upload */}
      {step === 'slides' && (
        <SlideUploadStep
          required={assignmentInfo?.slide_required ?? false}
          onContinue={(file) => { setSlideFile(file); setStep('recording') }}
          onSkip={() => setStep('recording')}
          onClose={goBack}
        />
      )}

      {/* Step: Recording */}
      {step === 'recording' && (topic || assignmentInfo) && (
        <RecordingInterface
          key={recordingKey}
          topic={topic?.topic ?? assignmentInfo?.title ?? ''}
          mode={mode}
          maxSecs={assignmentInfo?.exam_mode && assignmentInfo.exam_duration_mins ? assignmentInfo.exam_duration_mins * 60 : 300}
          notes={notes || undefined}
          aiPoints={sessionAiPoints.length > 0 ? sessionAiPoints : undefined}
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
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
          >
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

            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Analysis takes 1–3 minutes. Do not close this tab.
            </p>

            {uploadError && <p className="text-xs" style={{ color: '#dc2626' }}>{uploadError}</p>}
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
