'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Pause, Play, Square, AlertTriangle, Camera } from 'lucide-react'
import { Button } from './ui/Button'

interface RecordingInterfaceProps {
  topic: string
  mode: 'unguided' | 'guided' | 'exam'
  maxSecs?: number
  onComplete: (blob: Blob, durationSecs: number) => void
}

const FILLERS = ['um', 'uh', 'ah', 'er', 'like', 'you know']

export function RecordingInterface({ topic, mode, maxSecs = 300, onComplete }: RecordingInterfaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const animFrameRef = useRef<number>(0)
  const chunksRef = useRef<Blob[]>([])
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const elapsedRef = useRef(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const wordTimesRef = useRef<number[]>([])
  const faceCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [status, setStatus] = useState<'initialising' | 'recording' | 'paused' | 'done'>('initialising')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState<{ message: string; isRed?: boolean } | null>(null)
  const [speechAvailable, setSpeechAvailable] = useState<boolean | null>(null)

  function showWarning(w: { message: string; isRed?: boolean }) {
    setWarning(w)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    warningTimerRef.current = setTimeout(() => setWarning(null), 4000)
  }

  // T2.05E — Guided mode real-time analysis via Web Speech API + periodic gaze reminder
  useEffect(() => {
    if (mode !== 'guided' || status !== 'recording') return

    // ── Speech recognition (WPM + filler detection) ──────────────────────────
    const SpeechRec =
      (window as typeof window & { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition

    if (!SpeechRec) {
      setSpeechAvailable(false)
      return
    }

    let started = false
    let wpmCheckTimer: ReturnType<typeof setTimeout> | null = null

    function startRecognition(lang: string) {
      const recognition = new SpeechRec!()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = lang
      recognitionRef.current = recognition

      recognition.onstart = () => {
        started = true
        setSpeechAvailable(true)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const now = Date.now()
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript.toLowerCase().trim()
          if (!t) continue

          // Filler detection
          if (FILLERS.some((f) => t.split(/\s+/).includes(f))) {
            showWarning({ message: 'Watch your filler words (um, uh, like)', isRed: false })
          }

          // Collect word timestamps for WPM
          const words = t.split(/\s+/).filter(Boolean)
          words.forEach(() => wordTimesRef.current.push(now))
        }

        // WPM check 500ms after last speech event
        if (wpmCheckTimer) clearTimeout(wpmCheckTimer)
        wpmCheckTimer = setTimeout(() => {
          const cutoff = Date.now() - 15000
          wordTimesRef.current = wordTimesRef.current.filter((ts) => ts > cutoff)
          const wpm = Math.round((wordTimesRef.current.length / 15) * 60)
          if (wpm > 0 && wpm < 90) showWarning({ message: 'Speaking too slowly — pick up the pace', isRed: false })
          if (wpm > 160) showWarning({ message: 'Speaking too fast — aim for 130–150 WPM', isRed: false })
        }, 500)
      }

      recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
        const err = e.error
        if (!started && lang === 'en-MY' && (err === 'language-not-supported' || err === 'network')) {
          // Retry with en-US
          try { recognition.stop() } catch {}
          startRecognition('en-US')
          return
        }
        if (err === 'not-allowed' || err === 'audio-capture') {
          setSpeechAvailable(false)
        }
        // For 'no-speech' or 'aborted' — restart recognition to keep it continuous
        if (err === 'no-speech' || err === 'aborted') {
          try { recognition.start() } catch {}
        }
      }

      recognition.onend = () => {
        // Auto-restart if still recording (recognition stops after silence)
        if (recognitionRef.current === recognition) {
          try { recognition.start() } catch {}
        }
      }

      try {
        recognition.start()
      } catch {
        setSpeechAvailable(false)
      }
    }

    startRecognition('en-MY')

    // ── Gaze & camera reminders (every 30s) ───────────────────────────────────
    // Give a periodic reminder to maintain eye contact since we can't do
    // real-time gaze detection without MediaPipe in-browser.
    let gazeReminderCount = 0
    const GAZE_REMINDERS = [
      'Maintain eye contact — look at the camera',
      'Remember to look directly at the camera',
      'Keep steady eye contact with your audience',
    ]
    faceCheckRef.current = setInterval(() => {
      const video = videoRef.current
      if (!video) return

      // Pixel coverage check — detect if camera is blocked
      const canvas = document.createElement('canvas')
      canvas.width = 80; canvas.height = 60
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      try {
        ctx.drawImage(video, 0, 0, 80, 60)
        const { data } = ctx.getImageData(0, 0, 80, 60)
        let nonBlack = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 30) nonBlack++
        }
        const coverage = nonBlack / (80 * 60)
        if (coverage < 0.05) {
          showWarning({ message: 'Camera blocked — make sure camera is unobstructed', isRed: true })
          return
        }
      } catch { /* ignore */ }

      // Periodic eye-contact reminder
      showWarning({ message: GAZE_REMINDERS[gazeReminderCount % GAZE_REMINDERS.length], isRed: false })
      gazeReminderCount++
    }, 30000) // every 30 seconds

    return () => {
      if (wpmCheckTimer) clearTimeout(wpmCheckTimer)
      try { recognitionRef.current?.stop() } catch {}
      recognitionRef.current = null
      if (faceCheckRef.current) clearInterval(faceCheckRef.current)
      wordTimesRef.current = []
    }
  }, [mode, status])

  // Elapsed timer
  useEffect(() => {
    if (status !== 'recording') return
    const t = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
      if (elapsedRef.current >= maxSecs) stopRecording()
    }, 1000)
    return () => clearInterval(t)
  }, [status, maxSecs])

  // Waveform visualiser
  function drawWaveform(analyser: AnalyserNode) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const buf = new Uint8Array(analyser.frequencyBinCount)
    const c = ctx
    const w = canvas.width
    const h = canvas.height

    function loop() {
      animFrameRef.current = requestAnimationFrame(loop)
      analyser.getByteTimeDomainData(buf)
      c.clearRect(0, 0, w, h)
      c.lineWidth = 1.5
      c.strokeStyle = '#22c55e'
      c.beginPath()
      const sliceW = w / buf.length
      let x = 0
      for (let i = 0; i < buf.length; i++) {
        const y = (buf[i] / 128) * (h / 2)
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)
        x += sliceW
      }
      c.stroke()
    }
    loop()
  }

  // Camera init + auto-start recording
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }

        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream

        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx
        const src = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 512
        src.connect(analyser)
        drawWaveform(analyser)

        chunksRef.current = []
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm'
        const mr = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = mr
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' })
          onComplete(blob, elapsedRef.current)
        }
        mr.start(1000)
        setStatus('recording')
      } catch {
        if (!cancelled) setError('Camera or microphone access was denied. Please allow access and refresh.')
      }
    }

    init()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      cancelAnimationFrame(animFrameRef.current)
      audioCtxRef.current?.close()
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      try { recognitionRef.current?.stop() } catch {}
      if (faceCheckRef.current) clearInterval(faceCheckRef.current)
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    cancelAnimationFrame(animFrameRef.current)
    try { recognitionRef.current?.stop() } catch {}
    if (faceCheckRef.current) clearInterval(faceCheckRef.current)
    setStatus('done')
  }, [])

  function togglePause() {
    const mr = mediaRecorderRef.current
    if (!mr) return
    if (status === 'paused') { mr.resume(); setStatus('recording') }
    else { mr.pause(); setStatus('paused') }
  }

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  const maxMins = Math.floor(maxSecs / 60)
  const maxSs = maxSecs % 60
  const maxLabel = `${maxMins}:${maxSs.toString().padStart(2, '0')}`
  const progress = Math.min((elapsed / maxSecs) * 100, 100)

  const dotColor = status === 'recording' ? '#22c55e' : status === 'paused' ? '#f59e0b' : '#55556a'
  const statusLabel =
    status === 'initialising' ? 'Initialising camera...'
    : status === 'recording' ? 'Recording'
    : status === 'paused' ? 'Paused'
    : 'Done'

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="max-w-md w-full flex flex-col gap-4 rounded-2xl border p-6 text-center"
          style={{ background: 'rgba(14,14,22,0.55)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
        >
          <Camera size={32} className="mx-auto" style={{ color: '#ef4444', opacity: 0.7 }} />
          <p className="text-[#ef4444] text-sm">{error}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div
        className="w-full max-w-2xl flex flex-col gap-4 rounded-2xl border p-5"
        style={{ background: 'rgba(14,14,22,0.55)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%', background: dotColor,
                boxShadow: status === 'recording' ? `0 0 6px ${dotColor}` : 'none',
                animation: status === 'recording' ? 'pulse 2s ease-in-out infinite' : 'none',
                display: 'inline-block', transition: 'background 0.3s', flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#e8e8f0' }}>
              {statusLabel}
            </span>
            {mode === 'guided' && status === 'recording' && (
              <span style={{
                fontSize: 9,
                color: speechAvailable === false ? '#f59e0b' : '#22c55e',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginLeft: 4,
              }}>
                · {speechAvailable === false ? 'COACHING LIMITED (speech API unavailable)' : 'REAL-TIME COACHING'}
              </span>
            )}
            {mode === 'exam' && (
              <span style={{ fontSize: 9, color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase', marginLeft: 4 }}>
                · EXAM MODE
              </span>
            )}
          </div>
          <span className="text-sm text-[#8888a0] truncate max-w-[55%] text-right">{topic}</span>
        </div>

        {/* Video feed */}
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

          {/* Guided warning overlay */}
          {warning && mode === 'guided' && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm whitespace-nowrap"
              style={{
                background: warning.isRed ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.18)',
                border: `1px solid ${warning.isRed ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
                color: warning.isRed ? '#ef4444' : '#f59e0b',
                backdropFilter: 'blur(10px)',
                animation: 'slideDown 0.25s ease',
              }}
            >
              <AlertTriangle size={14} />
              {warning.message}
            </div>
          )}

          {/* Exam mode countdown badge */}
          {mode === 'exam' && status === 'recording' && (
            <div
              className="absolute top-3 right-3 rounded-lg px-3 py-1.5"
              style={{
                background: progress > 80 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.15)',
                border: `1px solid ${progress > 80 ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.3)'}`,
                color: progress > 80 ? '#ef4444' : '#f59e0b',
              }}
            >
              <span className="font-mono text-sm font-semibold">{maxSecs - elapsed}s left</span>
            </div>
          )}

          {/* Waveform overlay */}
          <div className="absolute bottom-0 inset-x-0 px-3 pb-2">
            <canvas ref={canvasRef} width={640} height={40} className="w-full" style={{ height: 40, opacity: 0.9 }} />
          </div>
        </div>

        {/* Timer + progress bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-[#e8e8f0]">{timeStr}</span>
            <span style={{ fontSize: 11, color: '#55556a' }}>Max {maxLabel}</span>
          </div>
          <div className="h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${progress}%`, background: progress > 85 ? '#ef4444' : '#3b82f6' }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-between">
          <Button variant="secondary" onClick={togglePause} disabled={status === 'initialising' || status === 'done'}>
            {status === 'paused' ? (
              <><Play size={14} className="mr-2" />Resume</>
            ) : (
              <><Pause size={14} className="mr-2" />Pause</>
            )}
          </Button>
          <Button onClick={stopRecording} disabled={status === 'initialising' || status === 'done'}>
            <Square size={14} className="mr-2" />
            Stop &amp; Analyse
          </Button>
        </div>
      </div>
    </div>
  )
}
