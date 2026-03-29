'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Pause, Play, Square, AlertTriangle, Camera, Eye, Mic, Clock } from 'lucide-react'
import { Button } from './ui/Button'

interface RecordingInterfaceProps {
  topic: string
  mode: 'unguided' | 'guided' | 'exam'
  maxSecs?: number
  onComplete: (blob: Blob, durationSecs: number) => void
}

// ── Filler word list (used in both guided filler detection & display) ─────────
const FILLERS = new Set(['um', 'uh', 'ah', 'er', 'like', 'you know'])

// ── Mode config — drives all visual and behavioural differences ───────────────
const MODE_CONFIG = {
  unguided: {
    label: 'UNGUIDED',
    borderColor: '#3b82f6',
    accentColor: '#3b82f6',
    bgTint: 'rgba(59,130,246,0.04)',
    badge: 'Baseline recording — no interruptions',
    coachingActive: false,
    examMode: false,
    pauseAllowed: true,
  },
  guided: {
    label: 'GUIDED',
    borderColor: '#22c55e',
    accentColor: '#22c55e',
    bgTint: 'rgba(34,197,94,0.04)',
    badge: 'Real-time coaching active',
    coachingActive: true,
    examMode: false,
    pauseAllowed: true,
  },
  exam: {
    label: 'EXAM',
    borderColor: '#f59e0b',
    accentColor: '#f59e0b',
    bgTint: 'rgba(245,158,11,0.04)',
    badge: 'MUET exam conditions — no pausing',
    coachingActive: false,
    examMode: true,
    pauseAllowed: false,
  },
}

// ── Active coaching rules shown in guided mode sidebar ────────────────────────
const COACHING_RULES = [
  { icon: Mic,   label: 'Filler words',   desc: 'Alerts on um, uh, er, like…' },
  { icon: Clock, label: 'Pacing',         desc: 'Alerts below 90 or above 160 WPM' },
  { icon: Eye,   label: 'Eye contact',    desc: 'Reminders every 45 s' },
]

export function RecordingInterface({ topic, mode, maxSecs = 300, onComplete }: RecordingInterfaceProps) {
  const cfg = MODE_CONFIG[mode]

  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null)
  const streamRef         = useRef<MediaStream | null>(null)
  const audioCtxRef       = useRef<AudioContext | null>(null)
  const animFrameRef      = useRef<number>(0)
  const chunksRef         = useRef<Blob[]>([])
  const warningTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const elapsedRef        = useRef(0)
  const recognitionRef    = useRef<SpeechRecognition | null>(null)
  const wordTimesRef      = useRef<number[]>([])
  const faceCheckRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptRef     = useRef('')          // full accumulated transcript
  const subtitleClearRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finalBufferRef    = useRef('')          // rolling subtitle buffer

  const [status, setStatus]             = useState<'initialising' | 'recording' | 'paused' | 'done'>('initialising')
  const [elapsed, setElapsed]           = useState(0)
  const [error, setError]               = useState('')
  const [warning, setWarning]           = useState<{ message: string; isRed?: boolean } | null>(null)
  const [speechAvailable, setSpeechAvailable] = useState<boolean | null>(null)
  const [subtitle, setSubtitle]         = useState<{ text: string; isFinal: boolean } | null>(null)
  const [transcript, setTranscript]     = useState<string[]>([])   // persistent lines for display
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll transcript to bottom when new lines arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // ── Warning display helper ────────────────────────────────────────────────
  function showWarning(w: { message: string; isRed?: boolean }) {
    if (mode !== 'guided') return  // warnings ONLY in guided mode
    setWarning(w)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    warningTimerRef.current = setTimeout(() => setWarning(null), 4000)
  }

  // ── Speech recognition — all modes get subtitles; guided gets coaching ────
  useEffect(() => {
    if (status !== 'recording') return

    const SpeechRec =
      (window as typeof window & { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition

    if (!SpeechRec) { setSpeechAvailable(false); return }

    let started = false
    let wpmCheckTimer: ReturnType<typeof setTimeout> | null = null

    function startRecognition(lang: string) {
      const recognition = new SpeechRec!()
      recognition.continuous    = true
      recognition.interimResults = true
      recognition.lang          = lang
      recognitionRef.current    = recognition

      recognition.onstart = () => { started = true; setSpeechAvailable(true) }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const now = Date.now()
        let interimText = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const t = result[0].transcript

          if (result.isFinal) {
            // ── Accumulate full transcript ──────────────────────────────
            transcriptRef.current = (transcriptRef.current + ' ' + t.trim()).trim()
            setTranscript(prev => {
              // Append new words; wrap into ~60-char display lines
              const allText = (prev.join(' ') + ' ' + t.trim()).trim()
              const words = allText.split(/\s+/)
              const lines: string[] = []
              let line = ''
              for (const w of words) {
                if ((line + ' ' + w).trim().length > 60) {
                  if (line) lines.push(line)
                  line = w
                } else {
                  line = (line + ' ' + w).trim()
                }
              }
              if (line) lines.push(line)
              return lines
            })

            // ── Guided: filler check on FINAL results ──────────────────
            if (mode === 'guided') {
              const words = t.toLowerCase().trim().split(/\s+/)
              const foundFillers = words.filter(w => FILLERS.has(w.replace(/[^a-z]/g, '')))
              if (foundFillers.length > 0) {
                const fillerList = [...new Set(foundFillers)].join(', ')
                showWarning({ message: `Filler word detected: "${fillerList}" — pause instead`, isRed: false })
              }
              words.forEach(() => wordTimesRef.current.push(now))
            }

            // ── Rolling subtitle buffer ─────────────────────────────────
            finalBufferRef.current = (finalBufferRef.current + ' ' + t.trim()).trim()
            const SUBTITLE_MAX = 80
            if (finalBufferRef.current.length > SUBTITLE_MAX) {
              const ws = finalBufferRef.current.split(/\s+/)
              while (ws.join(' ').length > SUBTITLE_MAX && ws.length > 1) ws.shift()
              finalBufferRef.current = ws.join(' ')
            }

          } else {
            interimText = t

            // ── Guided: filler check on INTERIM results too (WARN-02 fix) ──
            if (mode === 'guided') {
              const words = t.toLowerCase().trim().split(/\s+/)
              const lastWord = words[words.length - 1]?.replace(/[^a-z]/g, '')
              if (lastWord && FILLERS.has(lastWord)) {
                showWarning({ message: `Watch out — "${lastWord}" is a filler word`, isRed: false })
              }
            }
          }
        }

        // Update subtitle overlay
        const displayText = (finalBufferRef.current + (interimText ? ' ' + interimText.trim() : '')).trim()
        if (displayText) {
          setSubtitle({ text: displayText, isFinal: !interimText })
          if (!interimText) {
            if (subtitleClearRef.current) clearTimeout(subtitleClearRef.current)
            subtitleClearRef.current = setTimeout(() => {
              finalBufferRef.current = ''
              setSubtitle(null)
            }, 3000)
          }
        }

        // WPM check — guided only
        if (mode === 'guided') {
          if (wpmCheckTimer) clearTimeout(wpmCheckTimer)
          wpmCheckTimer = setTimeout(() => {
            const cutoff = Date.now() - 15000
            wordTimesRef.current = wordTimesRef.current.filter(ts => ts > cutoff)
            const wpm = Math.round((wordTimesRef.current.length / 15) * 60)
            if (wpm > 0 && wpm < 90)  showWarning({ message: 'Speaking too slowly — pick up the pace (target 120–150 WPM)', isRed: false })
            if (wpm > 160) showWarning({ message: 'Speaking too fast — slow down (target 120–150 WPM)', isRed: false })
          }, 500)
        }
      }

      recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
        const err = e.error
        if (!started && lang === 'en-MY' && (err === 'language-not-supported' || err === 'network')) {
          try { recognition.stop() } catch {}
          startRecognition('en-US')
          return
        }
        if (err === 'not-allowed' || err === 'audio-capture') setSpeechAvailable(false)
        if (err === 'no-speech' || err === 'aborted') {
          try { recognition.start() } catch {}
        }
      }

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          try { recognition.start() } catch {}
        }
      }

      try { recognition.start() } catch { setSpeechAvailable(false) }
    }

    startRecognition('en-MY')

    // ── Guided: periodic eye-contact reminders (honest — not fake detection) ──
    // CRIT-03 fix: We cannot do real gaze tracking in the browser without a
    // ML model. Instead we use timed reminders labelled honestly, plus a
    // basic camera-blocked check (pixel darkness).
    if (mode === 'guided') {
      let reminderCount = 0
      const REMINDERS = [
        'Look directly at the camera — maintain eye contact',
        'Keep steady eye contact with your audience',
        'Remember to look at the camera, not the screen',
        'Eye contact reminder — look toward the camera',
      ]

      faceCheckRef.current = setInterval(() => {
        const video = videoRef.current
        if (!video) return

        // Check if camera appears blocked (nearly all-black frame)
        const canvas = document.createElement('canvas')
        canvas.width = 80; canvas.height = 60
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        try {
          ctx.drawImage(video, 0, 0, 80, 60)
          const { data } = ctx.getImageData(0, 0, 80, 60)
          let bright = 0
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 30) bright++
          }
          if (bright / (80 * 60) < 0.05) {
            showWarning({ message: 'Camera appears blocked — check your webcam', isRed: true })
            return
          }
        } catch { /* ignore cross-origin */ }

        showWarning({ message: REMINDERS[reminderCount % REMINDERS.length], isRed: false })
        reminderCount++
      }, 45000)  // every 45 s — not too frequent
    }

    return () => {
      if (wpmCheckTimer) clearTimeout(wpmCheckTimer)
      try { recognitionRef.current?.stop() } catch {}
      recognitionRef.current = null
      if (faceCheckRef.current) clearInterval(faceCheckRef.current)
      wordTimesRef.current = []
      finalBufferRef.current = ''
      if (subtitleClearRef.current) clearTimeout(subtitleClearRef.current)
      setSubtitle(null)
    }
  }, [mode, status])

  // ── Elapsed timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'recording') return
    const t = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
      if (elapsedRef.current >= maxSecs) stopRecording()
    }, 1000)
    return () => clearInterval(t)
  }, [status, maxSecs])

  // ── Waveform ──────────────────────────────────────────────────────────────
  function drawWaveform(analyser: AnalyserNode) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const buf = new Uint8Array(analyser.frequencyBinCount)
    const c = ctx; const w = canvas.width; const h = canvas.height

    function loop() {
      animFrameRef.current = requestAnimationFrame(loop)
      analyser.getByteTimeDomainData(buf)
      c.clearRect(0, 0, w, h)
      c.lineWidth = 1.5
      c.strokeStyle = cfg.accentColor
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

  // ── Camera init ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
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
          ? 'video/webm;codecs=vp8,opus' : 'video/webm'
        const mr = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = mr
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
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
      streamRef.current?.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(animFrameRef.current)
      audioCtxRef.current?.close()
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      try { recognitionRef.current?.stop() } catch {}
      if (faceCheckRef.current) clearInterval(faceCheckRef.current)
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    cancelAnimationFrame(animFrameRef.current)
    try { recognitionRef.current?.stop() } catch {}
    if (faceCheckRef.current) clearInterval(faceCheckRef.current)
    setStatus('done')
  }, [])

  function togglePause() {
    if (!cfg.pauseAllowed) return  // exam mode: no pausing
    const mr = mediaRecorderRef.current
    if (!mr) return
    if (status === 'paused') { mr.resume(); setStatus('recording') }
    else { mr.pause(); setStatus('paused') }
  }

  const mins  = Math.floor(elapsed / 60)
  const secs  = elapsed % 60
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  const remaining = maxSecs - elapsed
  const remMins = Math.floor(remaining / 60)
  const remSecs = remaining % 60
  const remStr = `${remMins}:${remSecs.toString().padStart(2, '0')}`
  const progress = Math.min((elapsed / maxSecs) * 100, 100)

  const dotColor = status === 'recording' ? cfg.accentColor : status === 'paused' ? '#f59e0b' : '#55556a'

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full flex flex-col gap-4 rounded-2xl border p-6 text-center"
          style={{ background: 'rgba(14,14,22,0.55)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
          <Camera size={32} className="mx-auto" style={{ color: '#ef4444', opacity: 0.7 }} />
          <p className="text-[#ef4444] text-sm">{error}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">

      {/* ── Main recording card ─────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col gap-3 rounded-2xl border p-4"
        style={{
          background: cfg.bgTint,
          borderColor: cfg.borderColor + '55',
          boxShadow: `0 0 0 1px ${cfg.borderColor}22`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0,
              boxShadow: status === 'recording' ? `0 0 7px ${dotColor}` : 'none',
              animation: status === 'recording' ? 'pulse 2s ease-in-out infinite' : 'none',
            }} />
            {/* Mode badge — clearly labelled with mode colour */}
            <span
              className="text-[10px] font-bold tracking-[0.14em] px-2 py-0.5 rounded"
              style={{ background: cfg.borderColor + '22', color: cfg.accentColor, border: `1px solid ${cfg.borderColor}44` }}
            >
              {cfg.label}
            </span>
            <span className="text-[10px] text-[#55556a] hidden sm:inline">{cfg.badge}</span>
          </div>
          <span className="text-xs text-[#8888a0] truncate max-w-[45%] text-right">{topic}</span>
        </div>

        {/* Video feed */}
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video"
          style={{ border: `1.5px solid ${cfg.borderColor}33` }}>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

          {/* Guided warning overlay — slides in from top */}
          {warning && mode === 'guided' && (
            <div
              className="warning-overlay flex items-center gap-2 text-sm"
              style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                background: warning.isRed ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.18)',
                border: `1px solid ${warning.isRed ? 'rgba(239,68,68,0.45)' : 'rgba(245,158,11,0.45)'}`,
                color: warning.isRed ? '#ef4444' : '#f59e0b',
                backdropFilter: 'blur(10px)', borderRadius: 8, padding: '8px 16px',
                whiteSpace: 'nowrap', zIndex: 20, animation: 'slideDown 0.25s ease',
              }}
            >
              <AlertTriangle size={14} />
              {warning.message}
            </div>
          )}

          {/* Exam mode — remaining time badge, no pause badge */}
          {mode === 'exam' && status === 'recording' && (
            <div className="absolute top-3 right-3 rounded-lg px-3 py-1.5 flex items-center gap-1.5"
              style={{
                background: remaining < 30 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.18)',
                border: `1px solid ${remaining < 30 ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.4)'}`,
                color: remaining < 30 ? '#ef4444' : '#f59e0b',
              }}>
              <Clock size={12} />
              <span className="font-mono text-sm font-semibold">{remStr} left</span>
            </div>
          )}

          {/* Exam mode — no-pause badge */}
          {mode === 'exam' && status === 'recording' && (
            <div className="absolute top-3 left-3 rounded px-2 py-1"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <span className="text-[9px] font-bold tracking-widest text-[#f59e0b] uppercase">No Pausing — Exam Conditions</span>
            </div>
          )}

          {/* Live subtitle strip */}
          <div className="absolute inset-x-0 bottom-0"
            style={{ minHeight: 48, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
              display: 'flex', alignItems: 'flex-end', padding: '0 16px 10px' }}>
            {subtitle && status === 'recording' && (
              <p style={{
                fontSize: 14, fontWeight: 500, lineHeight: 1.4,
                color: subtitle.isFinal ? '#e8e8f0' : 'rgba(232,232,240,0.6)',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                transition: 'opacity 0.2s ease', maxWidth: '100%', wordBreak: 'break-word',
              }}>
                {subtitle.text}
              </p>
            )}
          </div>

          {/* Waveform */}
          <div className="absolute bottom-0 inset-x-0 px-3 pb-2" style={{ pointerEvents: 'none' }}>
            <canvas ref={canvasRef} width={640} height={28} className="w-full"
              style={{ height: 28, opacity: subtitle ? 0.3 : 0.85 }} />
          </div>
        </div>

        {/* Timer + progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-[#e8e8f0]">{timeStr}</span>
            <span className="font-mono text-xs text-[#55556a]">{remStr} remaining</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${progress}%`, background: progress > 85 ? '#ef4444' : cfg.accentColor }} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-between">
          <Button
            variant="secondary"
            onClick={togglePause}
            disabled={status === 'initialising' || status === 'done' || !cfg.pauseAllowed}
            title={!cfg.pauseAllowed ? 'Pausing is not allowed in exam mode' : undefined}
          >
            {status === 'paused'
              ? <><Play size={14} className="mr-2" />Resume</>
              : <><Pause size={14} className="mr-2" />Pause</>}
          </Button>
          <Button onClick={stopRecording} disabled={status === 'initialising' || status === 'done'}>
            <Square size={14} className="mr-2" />
            Stop &amp; Analyse
          </Button>
        </div>
      </div>

      {/* ── Right panel: transcript + guided coaching rules ──────────────── */}
      <div className="flex flex-col gap-3 lg:w-64 xl:w-72">

        {/* Guided coaching rules panel */}
        {mode === 'guided' && (
          <div className="rounded-xl border p-4 flex flex-col gap-3"
            style={{ background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.2)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#22c55e' }}>
              Active Coaching
            </p>
            {COACHING_RULES.map(rule => {
              const Icon = rule.icon
              return (
                <div key={rule.label} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(34,197,94,0.12)' }}>
                    <Icon size={12} style={{ color: '#22c55e' }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#e8e8f0]">{rule.label}</p>
                    <p className="text-[11px] text-[#55556a]">{rule.desc}</p>
                  </div>
                </div>
              )
            })}
            {speechAvailable === false && (
              <p className="text-[10px] text-[#f59e0b] border border-[#f59e0b33] rounded px-2 py-1 mt-1">
                Speech API unavailable — filler &amp; WPM coaching limited
              </p>
            )}
          </div>
        )}

        {/* Exam mode info panel */}
        {mode === 'exam' && (
          <div className="rounded-xl border p-4 flex flex-col gap-2"
            style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.2)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f59e0b' }}>
              Exam Conditions
            </p>
            {['No pausing allowed', 'No coaching interruptions', 'Timed delivery', 'MUET rubric scoring'].map(rule => (
              <div key={rule} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />
                <p className="text-[11px] text-[#8888a0]">{rule}</p>
              </div>
            ))}
          </div>
        )}

        {/* Unguided info panel */}
        {mode === 'unguided' && (
          <div className="rounded-xl border p-4 flex flex-col gap-2"
            style={{ background: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.2)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3b82f6' }}>
              Baseline Mode
            </p>
            {['No interruptions during recording', 'Full AI analysis after you stop', 'Your natural delivery baseline'].map(rule => (
              <div key={rule} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#3b82f6' }} />
                <p className="text-[11px] text-[#8888a0]">{rule}</p>
              </div>
            ))}
          </div>
        )}

        {/* Live transcript panel — all modes */}
        <div className="flex-1 rounded-xl border flex flex-col overflow-hidden"
          style={{ background: 'rgba(14,14,22,0.5)', borderColor: 'rgba(255,255,255,0.06)', minHeight: 180 }}>
          <div className="px-3 py-2 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#55556a' }}>
              Live Transcript
            </p>
            {speechAvailable === false && (
              <span className="text-[9px] text-[#f59e0b]">Speech API unavailable</span>
            )}
            {speechAvailable === true && status === 'recording' && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"
                  style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span className="text-[9px] text-[#22c55e]">Live</span>
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-0.5" style={{ maxHeight: 260 }}>
            {transcript.length === 0 ? (
              <p className="text-[11px] text-[#55556a] italic">
                {status === 'recording' ? 'Start speaking — transcript will appear here…' : 'Transcript will appear when recording starts.'}
              </p>
            ) : (
              transcript.map((line, i) => (
                <p key={i} className="text-xs text-[#e8e8f0] leading-relaxed">{line}</p>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>

          {transcript.length > 0 && (
            <div className="px-3 py-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] text-[#55556a]">
                {transcriptRef.current.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
