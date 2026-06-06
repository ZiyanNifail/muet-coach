'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, CheckCircle } from 'lucide-react'
import { getAuthHeaders } from '@/lib/supabase'
import { useNavigationGuard } from '@/lib/navGuard'
import { DeviceSelector } from '@/components/DeviceSelector'
import { useMediaDevices } from '@/lib/useMediaDevices'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const SIMLI_API_KEY = process.env.NEXT_PUBLIC_SIMLI_API_KEY || ''
const SIMLI_FACE_ID = process.env.NEXT_PUBLIC_SIMLI_FACE_ID || 'tmp9i8bbq7'
const TOTAL_QUESTIONS = 7

type Phase = 'connecting' | 'avatar_speaking' | 'listening' | 'processing' | 'complete'

type InitData = {
  question_text: string
  question_index: number
  total_questions: number
  job_role: string
}

const _initCache = new Map<string, InitData>()

function getInitData(sessionId: string): InitData | null {
  if (_initCache.has(sessionId)) return _initCache.get(sessionId)!
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(`interview_init_${sessionId}`)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as InitData
    _initCache.set(sessionId, data)
    sessionStorage.removeItem(`interview_init_${sessionId}`)
    return data
  } catch { return null }
}

function getAudioUrl(jobRole: string, questionIndex: number): string {
  if (questionIndex < 2) return `/interview-audio/icebreaker_${questionIndex}.mp3`
  return `/interview-audio/${jobRole}_${questionIndex - 2}.mp3`
}

async function fetchAsPcm16kHz(url: string): Promise<{ pcm: Int16Array; durationMs: number }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch audio: ${url}`)
  const arrayBuffer = await res.arrayBuffer()
  const ctx = new AudioContext({ sampleRate: 16000 })
  const buffer = await ctx.decodeAudioData(arrayBuffer)
  const channelData = buffer.getChannelData(0)
  const pcm = new Int16Array(channelData.length)
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]))
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  const durationMs = (channelData.length / 16000) * 1000
  await ctx.close()
  return { pcm, durationMs }
}

export default function InterviewRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()

  const initData = getInitData(sessionId)
  const jobRole = initData?.job_role ?? 'software_engineer'
  const initialQuestion = initData?.question_text ?? ''
  const initialIndex = initData?.question_index ?? 0
  const total = initData?.total_questions ?? TOTAL_QUESTIONS

  const {
    cameras, microphones, selectedCameraId, selectedMicId,
    selectCamera, selectMic, clearCamera, clearMic, refresh,
    buildVideoConstraints, buildAudioConstraints,
  } = useMediaDevices()

  const [phase, setPhase] = useState<Phase>('connecting')
  useNavigationGuard(phase !== 'connecting' && phase !== 'complete', 'the Mock Interview')
  const [questionText, setQuestionText] = useState(initialQuestion)
  const [questionIndex, setQuestionIndex] = useState(initialIndex)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Connecting to interview room…')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  // AI avatar refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simliClientRef = useRef<any>(null)
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // User camera + audio analysis refs
  const userVideoRef = useRef<HTMLVideoElement>(null)
  const userStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const volBarFillRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingUsesSharedStream = useRef(false)

  // Live transcript — DOM-direct to avoid re-renders
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const liveTranscriptRef = useRef<HTMLParagraphElement>(null)

  // ── Volume bar (DOM-direct, 60fps) ────────────────────────────────────────
  const startVolumeAnimation = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)

    function tick() {
      if (!analyserRef.current || !analyser) return
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      const pct = Math.min(100, rms * 350)
      const bar = volBarFillRef.current
      if (bar) {
        bar.style.height = `${pct}%`
        // green when talking, red when clipping
        bar.style.background = pct > 75 ? '#ef4444' : pct > 20 ? '#22c55e' : '#3A7D6A'
      }
      animFrameRef.current = requestAnimationFrame(tick)
    }
    cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  // ── User camera + mic init ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function initCamera() {
      // Stop any previously held tracks before re-acquiring with a new device.
      userStreamRef.current?.getTracks().forEach(t => t.stop())
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: buildVideoConstraints({ facingMode: 'user' }),
          audio: buildAudioConstraints(),
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

        userStreamRef.current = stream
        if (userVideoRef.current) userVideoRef.current.srcObject = stream
        setCameraError(false)
        refresh()

        const ctx = new AudioContext()
        audioCtxRef.current = ctx
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        src.connect(analyser)
        analyserRef.current = analyser
        startVolumeAnimation()
      } catch (err) {
        if (cancelled) return
        // A selected device may have been unplugged — clear it and retry default.
        if ((err as DOMException)?.name === 'OverconstrainedError' && (selectedCameraId || selectedMicId)) {
          clearCamera(); clearMic()
          return
        }
        setCameraError(true)
      }
    }

    initCamera()

    return () => {
      cancelled = true
      cancelAnimationFrame(animFrameRef.current)
      userStreamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close()
      userStreamRef.current = null
      analyserRef.current = null
    }
  }, [startVolumeAnimation, selectedCameraId, selectedMicId, buildVideoConstraints, buildAudioConstraints, clearCamera, clearMic, refresh])

  // ── Live transcript — active only while listening ─────────────────────────
  useEffect(() => {
    if (phase !== 'listening') {
      const rec = recognitionRef.current
      recognitionRef.current = null
      try { rec?.stop() } catch {}
      const el = liveTranscriptRef.current
      if (el) { el.textContent = ''; el.style.display = 'none' }
      return
    }

    const SpeechRec =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) return

    const rec = new SpeechRec() as SpeechRecognition
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-MY'
    recognitionRef.current = rec

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      const el = liveTranscriptRef.current
      if (el) {
        const trimmed = text.trim()
        el.textContent = trimmed
        el.style.display = trimmed ? 'block' : 'none'
      }
    }

    // Auto-restart to keep recognition alive
    rec.onend = () => {
      if (recognitionRef.current === rec) try { rec.start() } catch {}
    }

    try { rec.start() } catch {}

    return () => {
      recognitionRef.current = null
      try { rec.stop() } catch {}
    }
  }, [phase])

  // ── Simli avatar audio ────────────────────────────────────────────────────
  const speakOnAvatar = useCallback(async (qIndex: number) => {
    const url = getAudioUrl(jobRole, qIndex)
    try {
      const { pcm, durationMs } = await fetchAsPcm16kHz(url)
      if (simliClientRef.current) simliClientRef.current.sendAudioData(new Uint8Array(pcm.buffer))
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current)
      speakTimerRef.current = setTimeout(() => {
        setPhase('listening')
        setStatusMsg('Your turn — press the mic and answer')
      }, durationMs + 900)
    } catch {
      await speakWithFallback(url)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobRole])

  async function speakWithFallback(url: string) {
    const audio = audioRef.current
    if (!audio) { setPhase('listening'); setStatusMsg('Your turn — press the mic and answer'); return }
    audio.pause()
    audio.src = url
    const onEnd = () => {
      setPhase('listening')
      setStatusMsg('Your turn — press the mic and answer')
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('error', onEnd)
    }
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('error', onEnd)
    audio.play().catch(() => { setPhase('listening'); setStatusMsg('Your turn — press the mic and answer') })
  }

  function stopSimli() {
    const client = simliClientRef.current
    if (!client) return
    simliClientRef.current = null
    try { client.stop() } catch {}
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const { SimliClient, generateSimliSessionToken, generateIceServers } = await import('simli-client')
        if (cancelled) return
        const [tokenResp, iceServers] = await Promise.all([
          generateSimliSessionToken({
            config: { faceId: SIMLI_FACE_ID, handleSilence: true, maxSessionLength: 600, maxIdleTime: 300 },
            apiKey: SIMLI_API_KEY,
          }),
          generateIceServers(SIMLI_API_KEY),
        ])
        if (cancelled) return
        const client = new SimliClient(tokenResp.session_token, videoRef.current!, audioRef.current!, iceServers)
        simliClientRef.current = client
        await client.start()
        if (cancelled) return
        setPhase('avatar_speaking')
        setStatusMsg('Listen to the question…')
        await new Promise(r => setTimeout(r, 600))
        if (!cancelled) await speakOnAvatar(initialIndex)
      } catch {
        if (!cancelled) {
          setPhase('avatar_speaking')
          setStatusMsg('Listen to the question…')
          await speakWithFallback(getAudioUrl(jobRole, initialIndex))
        }
      }
    }

    init()
    return () => {
      cancelled = true
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current)
      stopSimli()
      audioRef.current?.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Recording — reuses camera stream audio track ──────────────────────────
  function startRecording() {
    if (isRecording) return
    const shared = userStreamRef.current
    if (shared && shared.getAudioTracks().length > 0) {
      // Wrap just the audio track — no new getUserMedia prompt
      const audioStream = new MediaStream(shared.getAudioTracks())
      const mr = new MediaRecorder(audioStream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start()
      mediaRecorderRef.current = mr
      recordingUsesSharedStream.current = true
      setIsRecording(true)
      setStatusMsg('Recording… press again to submit')
      return
    }
    // Fallback: audio-only if camera permission was denied
    navigator.mediaDevices.getUserMedia({ audio: buildAudioConstraints() }).then((stream) => {
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start()
      mediaRecorderRef.current = mr
      recordingUsesSharedStream.current = false
      setIsRecording(true)
      setStatusMsg('Recording… press again to submit')
    })
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current
    if (!mr) return
    mr.onstop = () => {
      // Only stop the stream's tracks if it was a fallback (not the shared camera stream)
      if (!recordingUsesSharedStream.current) mr.stream.getTracks().forEach(t => t.stop())
      submitAnswer(new Blob(chunksRef.current, { type: 'audio/webm' }))
    }
    mr.stop()
    setIsRecording(false)
    setPhase('processing')
    setStatusMsg('Processing your answer…')
  }

  async function submitAnswer(audioBlob: Blob) {
    try {
      const headers = await getAuthHeaders()
      const form = new FormData()
      form.append('session_id', sessionId)
      form.append('question_index', String(questionIndex))
      form.append('question_text', questionText)
      form.append('audio', audioBlob, 'answer.webm')
      const res = await fetch(`${API_URL}/api/interview/respond`, { method: 'POST', headers, body: form })
      if (!res.ok) throw new Error('Submit failed')
      const data = await res.json()
      setTranscript(data.transcript)
      setFeedback(data.feedback)
      if (data.is_last) {
        setStatusMsg('Interview complete — generating your report…')
        setPhase('complete')
        await generateReport()
      } else {
        setTranscript(''); setFeedback('')
        setQuestionText(data.next_question)
        setQuestionIndex(data.next_question_index)
        setPhase('avatar_speaking')
        setStatusMsg('Listen to the next question…')
        await new Promise(r => setTimeout(r, 400))
        await speakOnAvatar(data.next_question_index)
      }
    } catch {
      setPhase('listening')
      setStatusMsg('Error — try again')
    }
  }

  function cancelInterview() {
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current)
    stopSimli()
    audioRef.current?.pause()
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    router.push('/interview')
  }

  async function generateReport() {
    stopSimli()
    try {
      const headers = await getAuthHeaders()
      await fetch(`${API_URL}/api/interview/complete`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
    } catch {}
    router.push(`/interview/${sessionId}/results`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-6 gap-5">
      <audio ref={audioRef} autoPlay hidden />

      {/* Progress bar */}
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Question {Math.min(questionIndex + 1, total)} of {total}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {Math.round((questionIndex / total) * 100)}% complete
          </span>
        </div>
        <div className="w-full rounded-full h-1.5" style={{ background: 'var(--border-subtle)' }}>
          <motion.div
            className="h-1.5 rounded-full"
            style={{ background: 'var(--accent-teal)' }}
            animate={{ width: `${(questionIndex / total) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* ── Two-panel layout ──────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

        {/* ── LEFT: User camera ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ aspectRatio: '4/3', background: '#0a0a0a', border: '1px solid var(--border-subtle)' }}
          >
            {/* Camera feed (mirrored so it feels natural) */}
            <video
              ref={userVideoRef}
              autoPlay muted playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Camera unavailable fallback */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{ background: 'var(--bg-surface)' }}>
                <span style={{ fontSize: 32 }}>📷</span>
                <p className="text-xs text-center px-6" style={{ color: 'var(--text-tertiary)' }}>
                  Camera unavailable — audio recording still active
                </p>
              </div>
            )}

            {/* ── Volume bar — vertical strip, left edge, fills bottom-up ── */}
            <div
              className="absolute left-2.5 top-3 bottom-3 rounded-full overflow-hidden flex flex-col justify-end"
              style={{ width: 5, background: 'rgba(255,255,255,0.15)' }}
            >
              <div
                ref={volBarFillRef}
                className="w-full rounded-full"
                style={{
                  height: '0%',
                  background: '#3A7D6A',
                  transition: 'height 55ms linear, background 120ms ease',
                }}
              />
            </div>

            {/* Recording pulse ring */}
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  key="user-rec-ring"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ border: '2px solid #ef4444', boxShadow: '0 0 16px #ef444455' }}
                />
              )}
            </AnimatePresence>

            {/* Live transcript subtitle strip */}
            <div className="absolute inset-x-3 bottom-3 flex justify-center">
              <p
                ref={liveTranscriptRef}
                style={{
                  display: 'none',
                  fontSize: 12,
                  fontWeight: 400,
                  lineHeight: 1.5,
                  color: '#f0ede6',
                  background: 'rgba(0,0,0,0.70)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  textAlign: 'center',
                }}
              />
            </div>
          </div>

          <p className="text-xs font-semibold tracking-widest uppercase text-center"
            style={{ color: 'var(--text-tertiary)' }}>
            You
          </p>

          <DeviceSelector
            cameras={cameras}
            microphones={microphones}
            selectedCameraId={selectedCameraId}
            selectedMicId={selectedMicId}
            onSelectCamera={selectCamera}
            onSelectMic={selectMic}
            disabled={isRecording}
          />

          {/* Mic button sits under the user panel */}
          <div className="flex justify-center min-h-[44px] items-center">
            {(phase === 'listening' || isRecording) && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className="flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-sm transition-all"
                style={{
                  background: isRecording ? '#ef4444' : 'var(--accent-teal)',
                  color: '#fff',
                  boxShadow: isRecording ? '0 0 20px #ef444466' : '0 0 20px var(--accent-teal)44',
                }}
              >
                {isRecording
                  ? <><MicOff size={16} /> Stop &amp; Submit</>
                  : <><Mic size={16} /> Start Answer</>}
              </button>
            )}
            {phase === 'processing' && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <Loader2 size={16} className="animate-spin" />
                Evaluating your answer…
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: AI avatar ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ aspectRatio: '4/3', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: phase === 'connecting' ? 'none' : 'block' }}
            />

            {phase === 'connecting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-teal)' }} />
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Connecting avatar…</p>
              </div>
            )}

            <AnimatePresence>
              {phase === 'avatar_speaking' && (
                <motion.div
                  key="pulse"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.02, 0.95] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ border: '2px solid var(--accent-teal)', boxShadow: '0 0 20px var(--accent-teal)44' }}
                />
              )}
            </AnimatePresence>

            {phase === 'complete' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl"
                style={{ background: 'rgba(0,0,0,0.55)' }}>
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle size={36} style={{ color: 'var(--accent-teal)' }} />
                  <p className="text-xs font-medium text-white">Interview complete</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs font-semibold tracking-widest uppercase text-center"
            style={{ color: 'var(--text-tertiary)' }}>
            AI Interviewer
          </p>

          {/* Question text and status under AI panel */}
          <AnimatePresence mode="wait">
            <motion.p
              key={questionText}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-center text-sm font-medium leading-relaxed px-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {questionText}
            </motion.p>
          </AnimatePresence>

          <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            {statusMsg}
          </p>
        </div>
      </div>

      {/* ── Transcript + feedback (full width below panels) ───────────────── */}
      <AnimatePresence>
        {transcript && phase !== 'avatar_speaking' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-4xl rounded-xl px-4 py-3 border text-sm"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>Your answer</p>
            <p className="leading-relaxed">{transcript}</p>
            {feedback && (
              <>
                <div className="my-2 border-t" style={{ borderColor: 'var(--border-subtle)' }} />
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>Quick feedback</p>
                <p className="leading-relaxed">{feedback}</p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel */}
      {phase !== 'complete' && phase !== 'processing' && (
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {showCancelConfirm ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-3"
              >
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Leave interview? Progress will be lost.
                </span>
                <button
                  onClick={cancelInterview}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  Yes, leave
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Stay
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="cancel-btn"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
              >
                Cancel interview
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
