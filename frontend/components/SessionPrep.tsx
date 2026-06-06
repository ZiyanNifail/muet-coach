'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mic, Camera, CheckCircle2, ArrowRight, Volume2, AlertTriangle } from 'lucide-react'
import { Button } from './ui/Button'
import { suppressMediapipeLogs } from '@/lib/suppressMediapipeLogs'
import { DeviceSelector } from './DeviceSelector'
import { useMediaDevices } from '@/lib/useMediaDevices'

export interface PrepResult {
  passed: boolean
  speakingDb: number
  ambientDb: number
  framingOk: boolean
}

interface SessionPrepProps {
  onReady: (result: PrepResult) => void
  onSkip: () => void
}

// dBFS thresholds — mirror backend "good projection" band (voice_dynamics_service)
const TARGET_MIN_DB = -30
const TARGET_MAX_DB = -15
const AMBIENT_MAX_DB = -45
const MIN_SNR_DB = 15
const SUSTAIN_MS = 1500
const AMBIENT_MS = 2000

// Map a dBFS value (-60..0) to a meter percentage (0..100)
function dbToPct(db: number): number {
  return Math.max(0, Math.min(100, ((db + 60) / 60) * 100))
}
const TARGET_LEFT = dbToPct(TARGET_MIN_DB)
const TARGET_RIGHT = dbToPct(TARGET_MAX_DB)

const SAMPLE_SENTENCE = 'The quick brown fox jumps over the lazy dog near the river bank.'

type Stage = 'mic' | 'framing'
type MicPhase = 'ambient' | 'speak' | 'pass'

export function SessionPrep({ onReady, onSkip }: SessionPrepProps) {
  const [stage, setStage] = useState<Stage>('mic')
  const [error, setError] = useState<string | null>(null)
  const [streamReady, setStreamReady] = useState(false)

  const [micLevel, setMicLevel] = useState(-100)
  const [micPhase, setMicPhase] = useState<MicPhase>('ambient')
  const [micPassed, setMicPassed] = useState(false)

  const [framingHint, setFramingHint] = useState('Step into the frame')
  const [framingOk, setFramingOk] = useState(false)
  const [framingPassed, setFramingPassed] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const ambientDbRef = useRef(-100)
  const speakingDbRef = useRef(0)

  const {
    cameras, microphones, selectedCameraId, selectedMicId,
    selectCamera, selectMic, clearCamera, clearMic, refresh,
    buildVideoConstraints, buildAudioConstraints,
  } = useMediaDevices()

  // ── Acquire camera + mic (denoised constraints) — re-runs on device change ──
  useEffect(() => {
    let cancelled = false
    async function acquire() {
      // Stop any previously held tracks before re-acquiring with a new device.
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setStreamReady(false)
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: buildVideoConstraints(),
          audio: buildAudioConstraints(),
        })
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = s
        setError(null)
        setStreamReady(true)
        refresh() // labels populate once permission is granted
      } catch (err) {
        if (cancelled) return
        // A selected device may have been unplugged — clear it and retry default.
        if ((err as DOMException)?.name === 'OverconstrainedError' && (selectedCameraId || selectedMicId)) {
          clearCamera(); clearMic()
          return
        }
        setError('Camera and microphone access is required. Please allow access and try again.')
      }
    }
    acquire()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [selectedCameraId, selectedMicId, buildVideoConstraints, buildAudioConstraints, clearCamera, clearMic, refresh])

  // ── Mic stage: measure ambient noise floor, then speaking level ────────────
  useEffect(() => {
    if (stage !== 'mic' || !streamReady) return
    const track = streamRef.current?.getAudioTracks()[0]
    if (!track) return

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const src = ctx.createMediaStreamSource(new MediaStream([track]))
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    src.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)

    let ema = -100
    let phase: MicPhase = 'ambient'
    setMicPhase('ambient')
    const ambientSamples: number[] = []
    let phaseStart = performance.now()
    let sustained = 0
    let lastT = performance.now()
    let raf = 0

    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      let db = 20 * Math.log10(Math.sqrt(sum / buf.length) || 1e-7)
      if (!isFinite(db)) db = -100
      ema = ema * 0.8 + db * 0.2
      setMicLevel(ema)

      const now = performance.now()
      const dt = now - lastT
      lastT = now

      if (phase === 'ambient') {
        ambientSamples.push(ema)
        if (now - phaseStart >= AMBIENT_MS) {
          ambientDbRef.current = ambientSamples.reduce((a, b) => a + b, 0) / ambientSamples.length
          phase = 'speak'
          setMicPhase('speak')
          sustained = 0
        }
      } else if (phase === 'speak') {
        const inTarget = ema >= TARGET_MIN_DB && ema <= TARGET_MAX_DB
        const snrOk = ema - ambientDbRef.current >= MIN_SNR_DB
        if (inTarget && snrOk) {
          sustained += dt
        } else {
          sustained = Math.max(0, sustained - dt * 0.5)
        }
        if (sustained >= SUSTAIN_MS) {
          speakingDbRef.current = ema
          phase = 'pass'
          setMicPhase('pass')
          setMicPassed(true)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      try { src.disconnect() } catch {}
      ctx.close().catch(() => {})
    }
  }, [stage, streamReady])

  // ── Framing stage: client-side PoseLandmarker, red/green outline ───────────
  useEffect(() => {
    if (stage !== 'framing' || !streamReady) return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    video.srcObject = new MediaStream(stream.getVideoTracks())
    video.play().catch(() => {})

    type Landmarker = { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks?: { x: number; y: number; visibility?: number }[][] }; close: () => void }
    let destroyed = false
    let raf = 0
    let passStart = 0
    let landmarker: Landmarker | null = null

    function evaluate(lm: { x: number; y: number; visibility?: number }[] | undefined) {
      if (!lm) { setFramingOk(false); setFramingHint('Step into the frame'); passStart = 0; return }
      const nose = lm[0], ls = lm[11], rs = lm[12]
      const visible = (p?: { visibility?: number }) => !!p && (p.visibility === undefined || p.visibility > 0.5)
      if (!visible(nose) || !visible(ls) || !visible(rs)) {
        setFramingOk(false); setFramingHint('Make sure your head and shoulders are in view'); passStart = 0; return
      }
      const midX = (ls.x + rs.x) / 2
      const width = Math.abs(ls.x - rs.x)
      let hint = ''
      if (width < 0.18) hint = 'Move a little closer to the camera'
      else if (width > 0.52) hint = 'Step back from the camera'
      else if (midX < 0.32 || midX > 0.68 || nose.x < 0.3 || nose.x > 0.7) hint = 'Centre yourself in the frame'
      else if (nose.y < 0.08 || nose.y > 0.55) hint = 'Keep your head in the upper part of the frame'

      const ok = hint === ''
      setFramingOk(ok)
      setFramingHint(ok ? 'Perfect — hold this position' : hint)
      if (ok) {
        if (!passStart) passStart = performance.now()
        if (performance.now() - passStart >= 1000) setFramingPassed(true)
      } else {
        passStart = 0
      }
    }

    ;(async () => {
      try {
        suppressMediapipeLogs()
        const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
        )
        if (destroyed) return
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        }) as unknown as Landmarker
        const loop = () => {
          if (destroyed) return
          if (video.readyState >= 2 && landmarker) {
            try {
              const res = landmarker.detectForVideo(video, performance.now())
              evaluate(res.landmarks?.[0])
            } catch {}
          }
          raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
      } catch {
        setError('Could not load posture detection. You can continue without the framing check.')
      }
    })()

    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      try { landmarker?.close() } catch {}
    }
  }, [stage, streamReady])

  function finish() {
    onReady({
      passed: micPassed && framingPassed,
      speakingDb: Math.round(speakingDbRef.current),
      ambientDb: Math.round(ambientDbRef.current),
      framingOk: framingPassed,
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const meterPct = dbToPct(micLevel)
  const outlineColor = framingOk ? '#22c55e' : '#ef4444'

  return (
    <div className="flex-1 flex flex-col items-center p-4 md:p-6">
      <div className="w-full max-w-xl flex flex-col gap-5">
        {/* Step header */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
            SESSION SETUP · STEP {stage === 'mic' ? '1' : '2'} OF 2
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {stage === 'mic' ? 'Test your microphone' : 'Position yourself in frame'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {stage === 'mic'
              ? 'A clear, well-projected voice gives you an accurate transcript and a fairer score.'
              : 'Good framing lets the AI read your posture and eye contact reliably.'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
            <AlertTriangle size={14} /> <span>{error}</span>
          </div>
        )}

        {/* ── Mic stage ── */}
        {stage === 'mic' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 rounded-xl border p-5" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(58,125,106,0.12)', border: '1px solid rgba(58,125,106,0.30)' }}>
                <Mic size={18} style={{ color: '#3A7D6A' }} />
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {micPhase === 'ambient' && 'Measuring your room — please stay quiet for a moment…'}
                {micPhase === 'speak' && <>Read this aloud at a natural presenting volume:</>}
                {micPhase === 'pass' && 'Great — your microphone level is perfect.'}
              </div>
            </div>

            <DeviceSelector
              showCamera={false}
              microphones={microphones}
              selectedMicId={selectedMicId}
              onSelectMic={selectMic}
            />

            {micPhase === 'speak' && (
              <div className="rounded-lg px-4 py-3 text-sm italic" style={{ background: 'rgba(180,165,148,0.08)', color: 'var(--text-primary)' }}>
                “{SAMPLE_SENTENCE}”
              </div>
            )}

            {/* Volume meter with target zone */}
            <div className="flex flex-col gap-2">
              <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'var(--border-medium)' }}>
                <div className="absolute inset-y-0 z-0" style={{ left: `${TARGET_LEFT}%`, width: `${TARGET_RIGHT - TARGET_LEFT}%`, background: 'rgba(34,197,94,0.22)', borderLeft: '1px dashed rgba(34,197,94,0.5)', borderRight: '1px dashed rgba(34,197,94,0.5)' }} />
                <div className="absolute inset-y-0 left-0 z-10 rounded-full transition-[width] duration-75" style={{ width: `${meterPct}%`, background: meterPct >= TARGET_LEFT && meterPct <= TARGET_RIGHT ? '#22c55e' : meterPct < TARGET_LEFT ? '#f59e0b' : '#ef4444' }} />
              </div>
              <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                <span className="flex items-center gap-1"><Volume2 size={11} /> Too quiet</span>
                <span style={{ color: '#22c55e' }}>Target zone</span>
                <span>Too loud</span>
              </div>
            </div>

            {micPhase === 'pass' && (
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#22c55e' }}>
                <CheckCircle2 size={16} /> Microphone ready
              </div>
            )}
            {micPhase === 'ambient' && ambientDbRef.current > AMBIENT_MAX_DB && micLevel > AMBIENT_MAX_DB && (
              <div className="flex items-center gap-2 text-xs" style={{ color: '#d97706' }}>
                <AlertTriangle size={13} /> Your room sounds noisy — try a quieter space for the best results.
              </div>
            )}
          </motion.div>
        )}

        {/* ── Framing stage ── */}
        {stage === 'framing' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <div className="relative w-full overflow-hidden rounded-xl border" style={{ aspectRatio: '4 / 3', background: '#000', borderColor: framingOk ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.4)' }}>
              <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: `drop-shadow(0 0 ${framingOk ? 10 : 6}px ${outlineColor})`, transition: 'filter 0.2s ease' }}>
                <g stroke={outlineColor} strokeWidth={1.4} fill={framingOk ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)'} style={{ transition: 'stroke 0.2s ease, fill 0.2s ease' }}>
                  <circle cx="50" cy="26" r="13" />
                  <path d="M27 98 Q27 56 38 50 Q44 47 50 47 Q56 47 62 50 Q73 56 73 98 Z" />
                </g>
              </svg>
              <div className="absolute bottom-0 inset-x-0 px-3 py-2 text-sm font-medium text-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', color: framingOk ? '#4ade80' : '#fca5a5' }}>
                {framingPassed ? 'Framing locked in ✓' : framingHint}
              </div>
            </div>
            <DeviceSelector
              showMic={false}
              cameras={cameras}
              selectedCameraId={selectedCameraId}
              onSelectCamera={selectCamera}
            />
            {framingPassed && (
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#22c55e' }}>
                <CheckCircle2 size={16} /> Posture framing ready
              </div>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {stage === 'mic' ? (
            <Button onClick={() => setStage('framing')} disabled={!micPassed} className="min-h-[44px]">
              Continue <ArrowRight size={14} className="ml-1.5" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={!framingPassed} className="min-h-[44px]">
              <Camera size={14} className="mr-1.5" /> Start recording
            </Button>
          )}
          <Button variant="ghost" onClick={onSkip} className="min-h-[44px]">
            Skip setup
          </Button>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Skipping is allowed, but your feedback report may be less accurate.
        </p>
      </div>
    </div>
  )
}
