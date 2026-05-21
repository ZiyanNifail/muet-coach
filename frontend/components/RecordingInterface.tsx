'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Pause, Play, Square, AlertTriangle, Camera, Eye, Mic, Clock, X, RotateCcw, LayoutDashboard } from 'lucide-react'
import { Button } from './ui/Button'

interface RecordingInterfaceProps {
  topic: string
  mode: 'unguided' | 'guided' | 'exam'
  maxSecs?: number
  notes?: string
  onComplete: (blob: Blob, durationSecs: number) => void
  onCancel: (action: 'restart' | 'dashboard') => void
}

// ── Filler word list (used in both guided filler detection & display) ─────────
const FILLERS = new Set(['um', 'uh', 'ah', 'er', 'like', 'you know'])

// ── Mode config — drives all visual and behavioural differences ───────────────
const MODE_CONFIG = {
  unguided: {
    label: 'UNGUIDED',
    borderColor: '#6b7280',
    accentColor: '#94a3b8',
    bgTint: 'rgba(100,100,120,0.05)',
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
  { icon: Eye,   label: 'Eye contact',    desc: 'Gaze detection every 5 s' },
]

export function RecordingInterface({ topic, mode, maxSecs = 300, notes, onComplete, onCancel }: RecordingInterfaceProps) {
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
  const timerDisplayRef   = useRef<HTMLSpanElement>(null)
  const remDisplayRef     = useRef<HTMLSpanElement>(null)
  const progressFillRef   = useRef<HTMLDivElement>(null)
  const examTimerRef      = useRef<HTMLDivElement>(null)
  const recognitionRef    = useRef<SpeechRecognition | null>(null)
  const wordTimesRef      = useRef<number[]>([])
  const faceCheckRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptRef     = useRef('')          // full accumulated transcript
  const subtitleClearRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finalBufferRef    = useRef('')          // rolling subtitle buffer

  const cancelledRef = useRef(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const [status, setStatus]             = useState<'initialising' | 'recording' | 'paused' | 'done'>('initialising')
  const [error, setError]               = useState('')
  const [warning, setWarning]           = useState<{ message: string; isRed?: boolean } | null>(null)
  const [speechAvailable, setSpeechAvailable] = useState<boolean | null>(null)
  // subtitle is written directly to the DOM ref — never stored in state to avoid re-renders
  const subtitleDomRef = useRef<HTMLParagraphElement>(null)
  const [transcript, setTranscript]     = useState<string[]>([])   // persistent lines for display
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const faceMeshCanvasRef  = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceLandmarkerRef  = useRef<any>(null)
  const wpmBarFillRef      = useRef<HTMLDivElement>(null)
  const wpmLabelRef        = useRef<HTMLSpanElement>(null)

  // Auto-scroll transcript panel to bottom — scroll the container directly,
  // NOT scrollIntoView (which scrolls the page <main> and causes violent shake)
  useEffect(() => {
    const el = transcriptScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
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

    let wpmCheckTimer: ReturnType<typeof setTimeout> | null = null
    let restartTimer: ReturnType<typeof setTimeout> | null = null
    let restartCount = 0
    let hasProducedResults = false

    function startRecognition(lang: string) {
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null }

      const recognition = new SpeechRec!()
      recognition.continuous    = true
      recognition.interimResults = true
      recognition.lang          = lang
      recognitionRef.current    = recognition

      let started = false

      recognition.onstart = () => { started = true; setSpeechAvailable(true) }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        hasProducedResults = true
        restartCount = 0  // reset on success
        const now = Date.now()
        let interimText = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const t = result[0].transcript

          if (result.isFinal) {
            // ── Accumulate full transcript ──────────────────────────────
            transcriptRef.current = (transcriptRef.current + ' ' + t.trim()).trim()

            // Append-only: only wrap the NEW segment, preserving all prior lines
            requestAnimationFrame(() => setTranscript(prev => {
              const newWords = t.trim().split(/\s+/)
              const lines = [...prev]
              let lastLine = lines.pop() ?? ''
              for (const w of newWords) {
                if ((lastLine + ' ' + w).trim().length > 60) {
                  if (lastLine) lines.push(lastLine)
                  lastLine = w
                } else {
                  lastLine = (lastLine + ' ' + w).trim()
                }
              }
              if (lastLine) lines.push(lastLine)
              return lines
            }))

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

        // ── Update subtitle overlay directly in the DOM — no setState = no re-render ──
        const displayText = (finalBufferRef.current + (interimText ? ' ' + interimText.trim() : '')).trim()
        const el = subtitleDomRef.current
        if (el) {
          if (displayText) {
            el.textContent = displayText
            el.style.color = interimText ? 'rgba(232,232,240,0.6)' : '#f0ede6'
            el.style.display = 'block'
          }
          if (!interimText && displayText) {
            if (subtitleClearRef.current) clearTimeout(subtitleClearRef.current)
            subtitleClearRef.current = setTimeout(() => {
              finalBufferRef.current = ''
              if (subtitleDomRef.current) subtitleDomRef.current.style.display = 'none'
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
          try { recognition.abort() } catch {}
          startRecognition('en-US')
          return
        }
        if (err === 'not-allowed' || err === 'audio-capture') setSpeechAvailable(false)
        // All other errors (network, no-speech, aborted): onend will handle restart
      }

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return
        restartCount++
        // After 6 consecutive restarts with zero results, the speech API is
        // not working (network blocked, browser unsupported, etc). Stop looping
        // and show the user a clear message rather than silently doing nothing.
        if (restartCount > 6 && !hasProducedResults) {
          setSpeechAvailable(false)
          return
        }
        restartTimer = setTimeout(() => {
          restartTimer = null
          if (recognitionRef.current === recognition) startRecognition(lang)
        }, 300)
      }

      // Defer start by one tick so the 'recording' render commits to the DOM
      // before the recognition state update fires (CRIT-F02 fix — prevents
      // three cascading re-renders from stacking on the same paint frame).
      setTimeout(() => {
        try { recognition.start() } catch { setSpeechAvailable(false) }
      }, 0)
    }

    startRecognition('en-MY')

    // ── Guided: real-time gaze detection via backend MediaPipe ──────────────
    // Every 5 s, capture a video frame and POST it to /api/gaze-check.
    // If the backend detects the face is looking away, show a warning immediately.
    // Falls back to a camera-blocked check when the backend is unreachable.
    if (mode === 'guided') {
      let consecutiveOffCamera = 0

      faceCheckRef.current = setInterval(async () => {
        const video = videoRef.current
        if (!video || video.readyState < 2) return

        // Capture a downscaled frame (320×240) as JPEG for the backend
        const canvas = document.createElement('canvas')
        canvas.width = 320; canvas.height = 240
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        try {
          ctx.drawImage(video, 0, 0, 320, 240)

          // Camera-blocked check (all-black frame)
          const { data } = ctx.getImageData(0, 0, 320, 240)
          let bright = 0
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 30) bright++
          }
          if (bright / (320 * 240) < 0.05) {
            showWarning({ message: 'Camera appears blocked — check your webcam', isRed: true })
            consecutiveOffCamera = 0
            return
          }

          // Send frame to backend for MediaPipe gaze analysis
          const b64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1]
          const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
          const res = await fetch(`${apiUrl}/api/gaze/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: b64 }),
          })
          if (!res.ok) return

          const { on_camera, face_detected } = await res.json()

          if (!face_detected) {
            consecutiveOffCamera++
            if (consecutiveOffCamera >= 2) {
              showWarning({ message: 'Face not visible — make sure you are in frame', isRed: true })
            }
          } else if (!on_camera) {
            consecutiveOffCamera++
            if (consecutiveOffCamera >= 2) {
              showWarning({ message: 'Look at the camera — your gaze has drifted away', isRed: false })
            }
          } else {
            consecutiveOffCamera = 0
          }
        } catch { /* network error — skip silently */ }
      }, 5000)  // every 5 s for responsive feedback
    }

    return () => {
      if (wpmCheckTimer) clearTimeout(wpmCheckTimer)
      if (restartTimer) clearTimeout(restartTimer)
      // Null the ref BEFORE stopping — prevents onend from scheduling a restart
      const rec = recognitionRef.current
      recognitionRef.current = null
      try { rec?.stop() } catch {}
      if (faceCheckRef.current) clearInterval(faceCheckRef.current)
      wordTimesRef.current = []
      finalBufferRef.current = ''
      if (subtitleClearRef.current) clearTimeout(subtitleClearRef.current)
      if (subtitleDomRef.current) subtitleDomRef.current.style.display = 'none'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status])

  // ── Elapsed timer — DOM-direct updates, no setState = no re-renders ────────
  useEffect(() => {
    if (status !== 'recording') return
    const t = setInterval(() => {
      elapsedRef.current += 1
      const e = elapsedRef.current
      const mins = Math.floor(e / 60)
      const secs = e % 60
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      const remaining = maxSecs - e
      const remMins = Math.floor(remaining / 60)
      const remSecs = remaining % 60
      const remStr = `${remMins}:${remSecs.toString().padStart(2, '0')}`
      const pct = Math.min((e / maxSecs) * 100, 100)
      if (timerDisplayRef.current) timerDisplayRef.current.textContent = timeStr
      if (remDisplayRef.current) remDisplayRef.current.textContent = `${remStr} remaining`
      if (progressFillRef.current) {
        progressFillRef.current.style.width = `${pct}%`
        progressFillRef.current.style.background = pct > 85 ? '#ef4444' : cfg.accentColor
      }
      if (examTimerRef.current) {
        examTimerRef.current.style.background = remaining < 30 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.18)'
        examTimerRef.current.style.borderColor = remaining < 30 ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.4)'
        examTimerRef.current.style.color = remaining < 30 ? '#ef4444' : '#f59e0b'
        const span = examTimerRef.current.querySelector<HTMLSpanElement>('span.exam-rem')
        if (span) span.textContent = `${remStr} left`
      }
      // Live WPM bar (guided mode only)
      if (mode === 'guided') {
        const cutoff = Date.now() - 15000
        const recent = wordTimesRef.current.filter(ts => ts > cutoff)
        const wpm = recent.length > 0 ? Math.round((recent.length / 15) * 60) : 0
        if (wpmBarFillRef.current) {
          wpmBarFillRef.current.style.width = `${Math.min((wpm / 200) * 100, 100)}%`
          wpmBarFillRef.current.style.background =
            wpm === 0 ? '#9B8E80' : wpm >= 90 && wpm <= 160 ? '#22c55e' : '#f59e0b'
        }
        if (wpmLabelRef.current) {
          wpmLabelRef.current.textContent = wpm > 0 ? `${wpm} WPM` : '—'
          wpmLabelRef.current.style.color =
            wpm === 0 ? '#9B8E80' : wpm >= 90 && wpm <= 160 ? '#22c55e' : '#f59e0b'
        }
      }

      if (e >= maxSecs) stopRecording()
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, maxSecs])

  // ── Face mesh overlay (guided mode only) ─────────────────────────────────
  useEffect(() => {
    if (mode !== 'guided' || status !== 'recording') return

    let rafHandle = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let landmarker: any = null
    let tessellation: { start: number; end: number }[] = []
    let leftEyeConns: { start: number; end: number }[] = []
    let rightEyeConns: { start: number; end: number }[] = []
    let lastFrameTime = -1
    const FRAME_INTERVAL = 67  // ~15 fps
    let offCameraFrames = 0    // consecutive frames where gaze is off
    let lastWarnTime    = 0    // timestamp of last gaze warning (ms)

    function drawConns(
      ctx: CanvasRenderingContext2D,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lm: any[],
      conns: { start: number; end: number }[],
      w: number, h: number,
    ) {
      for (const c of conns) {
        const a = lm[c.start]; const b = lm[c.end]
        if (!a || !b) continue
        ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke()
      }
    }

    function loop(now: number) {
      rafHandle = requestAnimationFrame(loop)
      if (now - lastFrameTime < FRAME_INTERVAL) return
      lastFrameTime = now

      const video  = videoRef.current
      const canvas = faceMeshCanvasRef.current
      if (!video || !canvas || video.readyState < 2 || !landmarker) return

      const w = canvas.offsetWidth; const h = canvas.offsetHeight
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)

      try {
        const results = landmarker.detectForVideo(video, now)
        if (!results.faceLandmarks?.length) return
        const lm = results.faceLandmarks[0]

        // ── Gaze detection: head yaw + iris position ──────────────────
        // Head yaw: compare nose tip (4) to face midpoint (234↔454)
        const noseX       = lm[4]?.x   ?? 0.5
        const leftCheekX  = lm[234]?.x ?? 0
        const rightCheekX = lm[454]?.x ?? 1
        const faceMidX    = (leftCheekX + rightCheekX) / 2
        const faceWidth   = Math.max(rightCheekX - leftCheekX, 0.01)
        const headYaw     = Math.abs(noseX - faceMidX) / faceWidth  // 0 = straight, ~0.15+ = turned

        // Iris X within eye corners (tighter thresholds — 0.3/0.7)
        const lIrisX  = lm[468]?.x ?? 0.5
        const lOuterX = lm[33]?.x  ?? 0
        const lInnerX = lm[133]?.x ?? 1
        const rIrisX  = lm[473]?.x ?? 0.5
        const rInnerX = lm[362]?.x ?? 0
        const rOuterX = lm[263]?.x ?? 1

        const lRatio = lInnerX !== lOuterX ? (lIrisX - lOuterX) / (lInnerX - lOuterX) : 0.5
        const rRatio = rOuterX !== rInnerX ? (rIrisX - rInnerX) / (rOuterX - rInnerX) : 0.5

        const offCamera = headYaw > 0.12 || lRatio < 0.3 || lRatio > 0.7 || rRatio < 0.3 || rRatio > 0.7

        if (offCamera) {
          offCameraFrames++
          // Fire warning after 3 consecutive off-camera frames, then every 5 s
          if (offCameraFrames >= 3 && now - lastWarnTime > 5000) {
            lastWarnTime = now
            showWarning({ message: 'Look at the camera — maintain eye contact', isRed: false })
          }
        } else {
          offCameraFrames = 0
        }

        const eyeColor = offCamera ? 'rgba(239,68,68,0.9)' : 'rgba(34,197,94,0.9)'

        // Tesselation (very dim)
        ctx.strokeStyle = 'rgba(100,220,100,0.10)'; ctx.lineWidth = 0.5
        drawConns(ctx, lm, tessellation, w, h)

        // Eye contours
        ctx.strokeStyle = eyeColor; ctx.lineWidth = 1.8
        drawConns(ctx, lm, leftEyeConns, w, h)
        drawConns(ctx, lm, rightEyeConns, w, h)

        // Iris circles
        ctx.strokeStyle = eyeColor; ctx.lineWidth = 1.5
        if (lm[468] && lm[469]) {
          const cx = lm[468].x * w; const cy = lm[468].y * h
          const ex = lm[469].x * w; const ey = lm[469].y * h
          const r = Math.sqrt((cx - ex) ** 2 + (cy - ey) ** 2)
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
        }
        if (lm[473] && lm[474]) {
          const cx = lm[473].x * w; const cy = lm[473].y * h
          const ex = lm[474].x * w; const ey = lm[474].y * h
          const r = Math.sqrt((cx - ex) ** 2 + (cy - ey) ** 2)
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
        }
      } catch { /* skip frame on error */ }
    }

    async function init() {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
        tessellation  = FaceLandmarker.FACE_LANDMARKS_TESSELATION as { start: number; end: number }[]
        leftEyeConns  = FaceLandmarker.FACE_LANDMARKS_LEFT_EYE   as { start: number; end: number }[]
        rightEyeConns = FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE  as { start: number; end: number }[]

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
        )
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        })
        faceLandmarkerRef.current = landmarker
        rafHandle = requestAnimationFrame(loop)
      } catch (e) {
        console.warn('FaceLandmarker init failed:', e)
      }
    }

    init()

    return () => {
      cancelAnimationFrame(rafHandle)
      try { landmarker?.close() } catch { /* ignore */ }
      faceLandmarkerRef.current = null
      const c = faceMeshCanvasRef.current
      if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status])

  // ── Waveform ──────────────────────────────────────────────────────────────
  function drawWaveform(analyser: AnalyserNode) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const buf = new Uint8Array(analyser.frequencyBinCount)
    const c = ctx; const w = canvas.width; const h = canvas.height

    function loop() {
      if (!canvasRef.current) return  // component unmounted — stop loop
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
        if (i === 0) { c.moveTo(x, y) } else { c.lineTo(x, y) }
        x += sliceW
      }
      c.stroke()
    }
    loop()
  }

  // ── Camera init ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function getVideoTrack(): Promise<MediaStreamTrack> {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
        return s.getVideoTracks()[0]
      } catch {
        const s = await navigator.mediaDevices.getUserMedia({ video: true })
        return s.getVideoTracks()[0]
      }
    }

    async function getAudioTrack(): Promise<MediaStreamTrack> {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      return s.getAudioTracks()[0]
    }

    async function init() {
      try {
        const [videoTrack, audioTrack] = await Promise.all([getVideoTrack(), getAudioTrack()])
        if (cancelled) { videoTrack.stop(); audioTrack.stop(); return }

        const stream = new MediaStream([videoTrack, audioTrack])
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
          if (cancelledRef.current) return
          const blob = new Blob(chunksRef.current, { type: 'video/webm' })
          onComplete(blob, elapsedRef.current)
        }
        mr.start(1000)
        setStatus('recording')
      } catch (err) {
        if (cancelled) return
        const name = (err as DOMException).name
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setError('Camera or microphone access was denied. Please click the camera icon in your browser address bar and allow access, then refresh.')
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setError('Your camera or microphone is already in use by another application. Close it and refresh.')
        } else {
          setError(`Could not start camera or microphone (${name ?? 'unknown error'}). Please refresh and try again.`)
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCancel = useCallback(() => {
    cancelledRef.current = true
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    cancelAnimationFrame(animFrameRef.current)
    try { recognitionRef.current?.stop() } catch {}
    if (faceCheckRef.current) clearInterval(faceCheckRef.current)
    setShowCancelConfirm(true)
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

  const initRemMins = Math.floor(maxSecs / 60)
  const initRemSecs = maxSecs % 60
  const initRemStr = `${initRemMins}:${initRemSecs.toString().padStart(2, '0')}`

  const dotColor = status === 'recording' ? cfg.accentColor : status === 'paused' ? '#f59e0b' : '#9B8E80'

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full flex flex-col gap-4 rounded-2xl border p-6 text-center"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-medium)', backdropFilter: 'blur(20px)', transition: 'background 0.3s ease' }}>
          <Camera size={32} className="mx-auto" style={{ color: '#ef4444', opacity: 0.7 }} />
          <p className="text-[#ef4444] text-sm">{error}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 md:p-4 overflow-hidden relative">

      {/* ── Cancel confirmation overlay ─────────────────────────────────── */}
      {showCancelConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl"
          style={{ background: 'var(--bg-panel)', backdropFilter: 'blur(12px)', transition: 'background 0.3s ease' }}>
          <div className="flex flex-col items-center gap-6 text-center p-8 max-w-sm w-full">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <X size={24} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Cancel Recording?</h3>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Your recording will be discarded and not analysed.
                What would you like to do?
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => onCancel('restart')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: '#3A7D6A', color: '#fff' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#2d6356' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#3A7D6A' }}
              >
                <RotateCcw size={15} />
                Restart Recording
              </button>
              <button
                onClick={() => onCancel('dashboard')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--border-subtle)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)' }}
              >
                <LayoutDashboard size={15} />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main recording card ─────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 flex flex-col gap-3 rounded-2xl border p-4"
        style={{
          background: cfg.bgTint,
          borderColor: cfg.borderColor + '55',
          boxShadow: `0 0 0 1px ${cfg.borderColor}22`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          willChange: 'transform',
          transform: 'translateZ(0)',
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
            <span className="text-[10px] hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>{cfg.badge}</span>
          </div>
          <span className="text-xs truncate max-w-[45%] sm:max-w-[55%] text-right" style={{ color: 'var(--text-secondary)' }}>{topic}</span>
        </div>

        {/* Video feed */}
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[50vh] lg:max-h-none"
          style={{ border: `1.5px solid ${cfg.borderColor}33`, willChange: 'transform', transform: 'translateZ(0)', contain: 'layout style paint' }}>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

          {/* Face mesh overlay — guided mode only */}
          {mode === 'guided' && (
            <canvas ref={faceMeshCanvasRef} className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: 'none', zIndex: 5 }} />
          )}

          {/* Guided warning overlay — slides in from top */}
          {warning && mode === 'guided' && (
            <div
              className="warning-overlay flex items-center gap-2 text-sm font-medium"
              style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                background: warning.isRed ? 'rgba(30,5,5,0.92)' : 'rgba(28,18,0,0.92)',
                border: `1px solid ${warning.isRed ? 'rgba(239,68,68,0.7)' : 'rgba(245,158,11,0.7)'}`,
                color: warning.isRed ? '#fca5a5' : '#fcd34d',
                borderRadius: 8, padding: '9px 18px',
                whiteSpace: 'nowrap', zIndex: 20,
                boxShadow: warning.isRed
                  ? '0 4px 20px rgba(239,68,68,0.35)'
                  : '0 4px 20px rgba(245,158,11,0.35)',
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              {warning.message}
            </div>
          )}

          {/* Exam mode — remaining time badge, no pause badge */}
          {mode === 'exam' && status === 'recording' && (
            <div ref={examTimerRef} className="absolute top-3 right-3 rounded-lg px-3 py-1.5 flex items-center gap-1.5"
              style={{
                background: 'rgba(245,158,11,0.18)',
                border: '1px solid rgba(245,158,11,0.4)',
                color: '#f59e0b',
              }}>
              <Clock size={12} />
              <span className="exam-rem font-mono text-sm font-semibold">{initRemStr} left</span>
            </div>
          )}

          {/* Exam mode — no-pause badge */}
          {mode === 'exam' && status === 'recording' && (
            <div className="absolute top-3 left-3 rounded px-2 py-1"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <span className="text-[9px] font-bold tracking-widest text-[#f59e0b] uppercase">No Pausing — Exam Conditions</span>
            </div>
          )}

          {/* Live subtitle strip — rendered once, updated via DOM ref to avoid re-renders */}
          <div className="absolute inset-x-0 bottom-0"
            style={{ height: 48, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
              display: 'flex', alignItems: 'flex-end', padding: '0 16px 10px', overflow: 'hidden' }}>
            <p ref={subtitleDomRef} style={{
              display: 'none',
              fontSize: 14, fontWeight: 500, lineHeight: 1.4,
              color: '#f0ede6',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              maxWidth: '100%', wordBreak: 'break-word',
            }} />
          </div>

          {/* Waveform */}
          <div className="absolute bottom-0 inset-x-0 px-3 pb-2" style={{ pointerEvents: 'none' }}>
            <canvas ref={canvasRef} width={640} height={28} className="w-full"
              style={{ height: 28, opacity: 0.85 }} />
          </div>
        </div>

        {/* Timer + progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span ref={timerDisplayRef} className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>00:00</span>
            <span ref={remDisplayRef} className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{initRemStr} remaining</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
            <div ref={progressFillRef} className="h-full rounded-full"
              style={{ width: '0%', background: cfg.accentColor }} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={togglePause}
              disabled={status === 'initialising' || status === 'done' || !cfg.pauseAllowed}
              title={!cfg.pauseAllowed ? 'Pausing is not allowed in exam mode' : undefined}
              className="min-h-[44px] flex-1 sm:flex-none"
            >
              {status === 'paused'
                ? <><Play size={14} className="mr-2" />Resume</>
                : <><Pause size={14} className="mr-2" />Pause</>}
            </Button>
            <button
              onClick={handleCancel}
              disabled={status === 'done'}
              className="flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-colors min-h-[44px]"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
            >
              <X size={13} />
              Cancel
            </button>
          </div>
          <Button onClick={stopRecording} disabled={status === 'initialising' || status === 'done'} className="min-h-[44px] w-full sm:w-auto">
            <Square size={14} className="mr-2" />
            Stop &amp; Analyse
          </Button>
        </div>
      </div>

      {/* ── Right panel: transcript + guided coaching rules ──────────────── */}
      <div className="flex flex-col gap-3 w-full lg:w-64 xl:w-72 min-h-0 overflow-hidden">

        {/* Notes panel — visible when brainstorm notes exist */}
        {notes && (
          <div className="rounded-xl border p-4 flex flex-col gap-2"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              Your Notes
            </p>
            <div className="overflow-y-auto" style={{ maxHeight: 140 }}>
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{notes}</p>
            </div>
          </div>
        )}

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
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{rule.label}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{rule.desc}</p>
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
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{rule}</p>
              </div>
            ))}
          </div>
        )}

        {/* Unguided info panel */}
        {mode === 'unguided' && (
          <div className="rounded-xl border p-4 flex flex-col gap-2"
            style={{ background: 'rgba(100,100,120,0.05)', borderColor: 'rgba(107,114,128,0.25)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8' }}>
              Baseline Mode
            </p>
            {['No interruptions during recording', 'Full AI analysis after you stop', 'Your natural delivery baseline'].map(rule => (
              <div key={rule} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#6b7280' }} />
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{rule}</p>
              </div>
            ))}
          </div>
        )}

        {/* Live WPM bar — guided mode only */}
        {mode === 'guided' && (
          <div className="rounded-xl border p-3 flex flex-col gap-2"
            style={{ background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.2)' }}>
            <div className="flex items-center justify-between">
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#22c55e' }}>
                Live WPM
              </p>
              <span ref={wpmLabelRef} className="text-xs font-mono font-semibold" style={{ color: 'var(--text-tertiary)' }}>—</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
              <div ref={wpmBarFillRef} className="h-full rounded-full"
                style={{ width: '0%', background: 'var(--text-tertiary)', transition: 'width 0.6s ease, background-color 0.3s ease' }} />
            </div>
            <div className="flex justify-between" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
              <span>Slow</span>
              <span style={{ color: '#22c55e' }}>90 – 160</span>
              <span>Fast</span>
            </div>
          </div>
        )}

        {/* Live transcript panel — all modes */}
        <div className="flex-1 rounded-xl border flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', minHeight: 180, contain: 'layout' }}>
          <div className="px-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)', height: 32, flexShrink: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              Live Transcript
            </p>
            {/* Fixed-width right slot prevents layout shift when badge appears */}
            <span style={{ minWidth: 80, display: 'flex', justifyContent: 'flex-end' }}>
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
            </span>
          </div>

          <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto p-3 space-y-0.5" style={{ maxHeight: 260 }}>
            {transcript.length === 0 ? (
              speechAvailable === false ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-[#f59e0b]">Live transcript unavailable.</p>
                  <p className="text-[10px] leading-4" style={{ color: 'var(--text-tertiary)' }}>
                    Use <strong style={{ color: 'var(--text-secondary)' }}>Chrome or Edge</strong> for live transcript.
                    Firefox, Safari, and Opera do not support this API.
                    Your recording is still saved — the AI will transcribe it after you stop.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] italic" style={{ color: 'var(--text-tertiary)' }}>
                  {status === 'recording' ? 'Start speaking — transcript will appear here…' : 'Transcript will appear when recording starts.'}
                </p>
              )
            ) : (
              transcript.map((line, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{line}</p>
              ))
            )}
          </div>

          <div className="px-3 py-1.5 border-t" style={{ borderColor: 'var(--border-subtle)', height: 28, flexShrink: 0 }}>
            <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
              {transcript.length > 0 ? `${transcriptRef.current.split(/\s+/).filter(Boolean).length} words` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
