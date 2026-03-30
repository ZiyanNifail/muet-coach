'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { TopicWheel } from '@/components/TopicWheel'
import { BrainstormPanel } from '@/components/BrainstormPanel'
import { RecordingInterface } from '@/components/RecordingInterface'
import { AlertTriangle, Upload, X, FileText, Timer, Mic, Mic2 } from 'lucide-react'

type Step = 'mode' | 'topic' | 'brainstorm' | 'exam_prep' | 'slides' | 'recording' | 'processing'
type Mode = 'unguided' | 'guided' | 'exam'

const MODE_OPTIONS = [
  {
    mode: 'unguided' as Mode,
    title: 'UNGUIDED SESSION',
    desc: 'Baseline analysis. AI evaluates only after session ends. No interruptions during recording.',
    color: '#6b7280',
    badge: null as string | null,
    icon: Mic,
    features: ['No coaching interruptions', 'Full AI analysis at the end', 'Natural baseline recording'],
    buttonLabel: 'Start Session →',
  },
  {
    mode: 'guided' as Mode,
    title: 'GUIDED SESSION',
    desc: 'Real-time coaching. Warnings fire when you speak too fast, too slow, or lose eye contact.',
    color: '#22c55e',
    badge: 'RECOMMENDED' as string | null,
    icon: Mic2,
    features: ['Filler word alerts (um, uh, er…)', 'Live pace coaching (90–160 WPM)', 'Eye contact reminders every 45 s'],
    buttonLabel: 'Start Session →',
  },
  {
    mode: 'exam' as Mode,
    title: 'EXAM MODE',
    desc: 'MUET Part 1 format. 2-minute preparation followed by a 2-minute timed delivery.',
    color: '#f59e0b',
    badge: 'MUET FORMAT' as string | null,
    icon: Timer,
    features: ['No pausing allowed', '2 min prep + 2 min delivery', 'MUET rubric scoring only'],
    buttonLabel: 'Start Exam →',
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

// ── Exam Prep Step ───────────────────────────────────────────────────────────
function ExamPrepStep({ topic, onReady }: { topic: string; onReady: () => void }) {
  const [secs, setSecs] = useState(120)
  const [phase, setPhase] = useState<'prep' | 'ready'>('prep')

  useEffect(() => {
    if (phase !== 'prep') return
    if (secs <= 0) { setTimeout(() => setPhase('ready'), 0); return }
    const t = setTimeout(() => setSecs((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secs, phase])

  const mins = Math.floor(secs / 60)
  const s = secs % 60
  const timeStr = `${mins}:${s.toString().padStart(2, '0')}`
  const pct = ((120 - secs) / 120) * 100
  const color = secs > 40 ? '#22c55e' : secs > 20 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div
        className="w-full max-w-lg flex flex-col gap-5 rounded-2xl border p-8"
        style={{ background: 'rgba(14,14,22,0.55)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#f59e0b' }}>
          MUET PART 1 · PREPARATION PHASE
        </div>
        <div>
          <p className="text-[#55556a] text-xs mb-2">Your topic:</p>
          <h2 className="text-xl font-semibold text-[#e8e8f0]">{topic}</h2>
        </div>
        <p className="text-[#8888a0] text-sm leading-6">
          You have <strong className="text-[#e8e8f0]">2 minutes</strong> to prepare your response.
          Take notes mentally. When the timer ends, delivery begins automatically.
        </p>

        {phase === 'prep' ? (
          <>
            <div className="flex flex-col items-center gap-3">
              <span className="font-mono text-5xl font-semibold" style={{ color }}>{timeStr}</span>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
            <Button variant="secondary" onClick={onReady}>Skip — Start Delivery Now</Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-3 w-full justify-center"
              style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)', border: '1px solid' }}
            >
              <Timer size={16} style={{ color: '#f59e0b' }} />
              <span className="text-[#f59e0b] text-sm font-semibold">Preparation time is up — begin your delivery</span>
            </div>
            <Button className="w-full" onClick={onReady}>Start 2-Minute Delivery →</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Slide Upload Step ────────────────────────────────────────────────────────
function SlideUploadStep({
  onContinue,
  onSkip,
}: {
  onContinue: (file: File | null) => void
  onSkip: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    if (f.type !== 'application/pdf') return
    if (f.size > 20 * 1024 * 1024) { alert('PDF must be under 20 MB.'); return }
    setFile(f)
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl">
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 4 }}>
          SLIDES (OPTIONAL)
        </div>
        <h1 className="text-2xl font-semibold text-[#e8e8f0]">Upload your slide deck</h1>
        <p className="text-[#8888a0] text-sm mt-1">PDF only · Max 20 MB · Optional — skip if not needed</p>
      </div>

      {/* Drop zone */}
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 transition-colors"
        style={{
          borderColor: dragging ? '#94a3b8' : file ? '#22c55e' : 'rgba(255,255,255,0.10)',
          background: dragging ? 'rgba(148,163,184,0.05)' : 'rgba(255,255,255,0.02)',
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
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileText size={32} style={{ color: '#22c55e' }} />
            <span className="text-sm text-[#e8e8f0] font-semibold">{file.name}</span>
            <span className="text-xs text-[#55556a]">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            <button
              className="flex items-center gap-1 text-xs text-[#ef4444] hover:underline"
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
            >
              <X size={12} /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            <Upload size={28} style={{ color: '#55556a' }} />
            <div className="text-center">
              <p className="text-sm text-[#8888a0]">Drag and drop your PDF here</p>
              <p className="text-xs text-[#3a3a52] mt-1">or click to browse</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={() => onContinue(file)} disabled={!file}>
          Continue with slides →
        </Button>
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
      </div>
    </div>
  )
}

// ── Main PracticeContent ─────────────────────────────────────────────────────

export function PracticeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialMode = searchParams.get('mode') as Mode | null
  const [step, setStep] = useState<Step>(initialMode ? 'topic' : 'mode')
  const [mode, setMode] = useState<Mode>(initialMode || 'unguided')
  const [topic, setTopic] = useState<Topic | null>(null)
  const [slideFile, setSlideFile] = useState<File | null>(null)
  const [lowBandwidth, setLowBandwidth] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<'uploading' | 'analysing' | 'done'>('uploading')
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [])

  function handleModeSelect(m: Mode) {
    setMode(m)
    setStep('topic')
  }

  function handleTopicSelect(t: Topic) {
    setTopic(t)
    if (mode === 'exam') setStep('exam_prep')
    else setStep('brainstorm')
  }

  function handleBrainstormReady() { setStep('slides') }
  function handleExamPrepReady() { setStep('recording') }
  function handleSlideContinue(file: File | null) { setSlideFile(file); setStep('recording') }

  async function handleRecordingComplete(blob: Blob, durationSecs: number) {
    setStep('processing')
    setProcessingStatus('uploading')
    setUploadError(null)

    if (!checkBandwidth()) setLowBandwidth(true)

    let studentId = 'anonymous'
    let authToken = ''
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { session } } = await sb.auth.getSession()
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
        formData.append('session_mode', mode)
        formData.append('duration_secs', String(Math.round(durationSecs)))
        if (topic) {
          formData.append('topic_id', topic.id)
          formData.append('topic_text', topic.topic)
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
      {/* Step: Mode selector */}
      {step === 'mode' && (
        <div className="p-6 flex flex-col gap-6 max-w-2xl">
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 4 }}>
              PRACTICE
            </div>
            <h1 className="text-2xl font-semibold text-[#e8e8f0]">Choose session mode</h1>
            <p className="text-[#8888a0] text-sm mt-1">Select how you want to practise today.</p>
          </div>
          <div className="flex flex-col gap-3">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              return (
                <div
                  key={opt.mode}
                  className="flex flex-col gap-4 p-5 rounded-xl border cursor-pointer"
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
                        <p className="text-[#8888a0] text-sm mt-0.5 leading-5 max-w-lg">{opt.desc}</p>
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
                  <div className="flex items-center justify-between gap-4 pl-13">
                    <div className="flex gap-4 flex-wrap">
                      {opt.features.map(f => (
                        <div key={f} className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: opt.color, opacity: 0.6 }} />
                          <span style={{ fontSize: 11, color: '#55556a' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={(e) => { e.stopPropagation(); handleModeSelect(opt.mode) }}>
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
          <div className="p-6">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 4 }}>
              PRACTICE · {mode.toUpperCase()}
            </div>
            <h1 className="text-2xl font-semibold text-[#e8e8f0]">Selecting your topic...</h1>
          </div>
          <TopicWheel onSelect={handleTopicSelect} />
        </>
      )}

      {/* Step: Brainstorm panel (unguided / guided only) */}
      {step === 'brainstorm' && topic && (
        <>
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-[#e8e8f0]">Brainstorm</h1>
          </div>
          <BrainstormPanel topic={topic.topic} onReady={handleBrainstormReady} onSkip={handleBrainstormReady} />
        </>
      )}

      {/* Step: Exam prep (exam mode only) */}
      {step === 'exam_prep' && topic && (
        <ExamPrepStep topic={topic.topic} onReady={handleExamPrepReady} />
      )}

      {/* Step: Slide upload */}
      {step === 'slides' && (
        <SlideUploadStep onContinue={handleSlideContinue} onSkip={() => handleSlideContinue(null)} />
      )}

      {/* Step: Recording */}
      {step === 'recording' && topic && (
        <RecordingInterface
          topic={topic.topic}
          mode={mode}
          maxSecs={mode === 'exam' ? 120 : 300}
          onComplete={handleRecordingComplete}
        />
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div
            className="max-w-sm w-full flex flex-col items-center gap-5 rounded-xl border p-8 text-center"
            style={{ background: 'rgba(14,14,22,0.55)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {lowBandwidth && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs w-full" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
                <AlertTriangle size={13} />
                <span>Slow connection detected — upload may take longer</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
              <span className="text-[11px] font-semibold text-[#e8e8f0] tracking-wider">
                {processingStatus === 'uploading' ? 'UPLOADING' : processingStatus === 'analysing' ? 'ANALYSING' : 'DONE'}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-[#e8e8f0]">
              {processingStatus === 'uploading' ? 'Uploading your session...' : 'Analysing your session...'}
            </h2>
            {processingStatus === 'uploading' && (
              <div className="w-full">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #94a3b8, #8b5cf6)' }} />
                </div>
                <p className="text-[#55556a] text-xs mt-1">{uploadProgress}%</p>
              </div>
            )}
            {processingStatus === 'analysing' && (
              <p className="text-[#8888a0] text-sm">This may take up to 90 seconds. Please wait.</p>
            )}
            {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
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
