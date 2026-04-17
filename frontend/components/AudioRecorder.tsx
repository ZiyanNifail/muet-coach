'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { Mic, Square, RotateCcw } from 'lucide-react'

interface AudioRecorderProps {
  maxSecs?: number
  onBlob: (blob: Blob) => void
  disabled?: boolean
  label?: string
}

type RecorderStatus = 'idle' | 'recording' | 'done'

export function AudioRecorder({ maxSecs = 15, onBlob, disabled = false, label }: AudioRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [elapsed, setElapsed] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const data = new Uint8Array(analyser.frequencyBinCount)

    function loop() {
      animFrameRef.current = requestAnimationFrame(loop)
      if (!analyserRef.current) return
      analyserRef.current.getByteTimeDomainData(data)
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      ctx!.strokeStyle = '#3A7D6A'
      ctx!.lineWidth = 1.5
      ctx!.beginPath()
      const sliceW = canvas!.width / data.length
      let x = 0
      for (let i = 0; i < data.length; i++) {
        const y = (data[i] / 128.0) * (canvas!.height / 2)
        if (i === 0) ctx!.moveTo(x, y)
        else ctx!.lineTo(x, y)
        x += sliceW
      }
      ctx!.stroke()
    }
    loop()
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoStopRef.current) clearTimeout(autoStopRef.current)
    mediaRecorderRef.current?.stop()
  }, [])

  async function startRecording() {
    if (disabled) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Waveform analyser
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      drawWaveform()

      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        cancelAnimationFrame(animFrameRef.current)
        analyserRef.current = null
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setStatus('done')
        onBlob(blob)
      }

      mr.start()
      mediaRecorderRef.current = mr
      setStatus('recording')
      setElapsed(0)

      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
      autoStopRef.current = setTimeout(stopRecording, maxSecs * 1000)
    } catch {
      alert('Microphone access is required. Please allow microphone access in your browser and try again.')
    }
  }

  function reset() {
    setStatus('idle')
    setElapsed(0)
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (autoStopRef.current) clearTimeout(autoStopRef.current)
      try { mediaRecorderRef.current?.stop() } catch { /* ignore */ }
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <p className="text-sm text-[#6B6050] text-center">{label}</p>
      )}

      {/* Waveform canvas */}
      <canvas
        ref={canvasRef}
        width={220}
        height={44}
        className="rounded-lg"
        style={{
          background: 'rgba(58,125,106,0.05)',
          border: '1px solid rgba(58,125,106,0.15)',
          opacity: status === 'recording' ? 1 : 0.35,
          transition: 'opacity 0.2s',
        }}
      />

      {/* Controls */}
      <div className="flex items-center gap-3">
        {status === 'idle' && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: disabled ? 'rgba(180,165,148,0.12)' : 'rgba(58,125,106,0.10)',
              color: disabled ? '#C4B8A8' : '#3A7D6A',
              border: `1px solid ${disabled ? 'rgba(180,165,148,0.20)' : 'rgba(58,125,106,0.25)'}`,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <Mic size={14} />
            Record
          </button>
        )}

        {status === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: 'rgba(239,68,68,0.10)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.25)',
              cursor: 'pointer',
            }}
          >
            <Square size={13} fill="#ef4444" />
            Stop · {elapsed}s
          </button>
        )}

        {status === 'done' && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-all"
            style={{ color: '#9B8E80', border: '1px solid rgba(180,165,148,0.30)', cursor: 'pointer' }}
          >
            <RotateCcw size={12} />
            Record again
          </button>
        )}

        {status === 'recording' && (
          <span className="text-xs font-mono" style={{ color: '#ef4444' }}>
            ● REC · max {maxSecs}s
          </span>
        )}
      </div>
    </div>
  )
}
