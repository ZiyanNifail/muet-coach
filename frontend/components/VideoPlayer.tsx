'use client'
import { useEffect, useRef, useState } from 'react'
import { getAuthHeaders } from '@/lib/supabase'

interface EyeContactPoint {
  t: number     // chunk start time in seconds
  value: number // eye contact % for that chunk (0–100)
}

interface Props {
  presentationId: string
  eyeContactTimeline: EyeContactPoint[] | null
  duration: number | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function segmentColor(value: number): string {
  if (value >= 70) return '#22c55e'
  if (value >= 40) return '#f59e0b'
  return '#ef4444'
}

export function VideoPlayer({ presentationId, eyeContactTimeline, duration }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState<number>(duration ?? 0)

  useEffect(() => {
    let cancelled = false
    async function loadUrl() {
      try {
        const headers = await getAuthHeaders()
        const res = await fetch(
          `${API_URL}/api/presentations/${presentationId}/video-url`,
          { headers },
        )
        if (!res.ok) { if (!cancelled) setFetchError('Video not available for this session.'); return }
        const data = await res.json()
        if (!cancelled) setVideoUrl(data.url)
      } catch {
        if (!cancelled) setFetchError('Could not load video.')
      }
    }
    loadUrl()
    return () => { cancelled = true }
  }, [presentationId])

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) setVideoDuration(videoRef.current.duration)
  }

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !videoDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    videoRef.current.currentTime = ratio * videoDuration
  }

  const progressPct = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0

  // Find which chunk the playhead is currently in
  const activeChunk = eyeContactTimeline
    ? [...eyeContactTimeline].reverse().find((p) => p.t <= currentTime)
    : null

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-5"
      style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          SESSION REPLAY
        </div>
        {activeChunk != null && (
          <span
            className="text-xs font-mono"
            style={{ color: segmentColor(activeChunk.value) }}
          >
            Eye contact: {Math.round(activeChunk.value)}%
          </span>
        )}
      </div>

      {/* Video or states */}
      {fetchError ? (
        <p className="text-xs text-center py-6" style={{ color: 'var(--text-tertiary)' }}>{fetchError}</p>
      ) : !videoUrl ? (
        <div className="flex items-center justify-center h-32">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading video…</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full rounded-lg"
          style={{ maxHeight: 340, background: '#000' }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
      )}

      {/* Eye contact annotation timeline */}
      {eyeContactTimeline && eyeContactTimeline.length > 1 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              EYE CONTACT TIMELINE
            </span>
            <div className="flex items-center gap-3" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
              {[
                { color: '#22c55e', label: '≥70%' },
                { color: '#f59e0b', label: '40–70%' },
                { color: '#ef4444', label: '<40%' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Coloured segment scrubber */}
          <div
            className="relative h-4 rounded-full overflow-hidden cursor-pointer select-none"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            onClick={handleScrubberClick}
          >
            {eyeContactTimeline.map((point, i) => {
              const nextT = eyeContactTimeline[i + 1]?.t ?? videoDuration
              const startPct = videoDuration > 0 ? (point.t / videoDuration) * 100 : 0
              const widthPct = videoDuration > 0 ? ((nextT - point.t) / videoDuration) * 100 : 0
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full"
                  style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`,
                    background: segmentColor(point.value),
                    opacity: 0.55,
                  }}
                />
              )
            })}
            {/* Playhead */}
            <div
              className="absolute top-0 h-full w-0.5"
              style={{ left: `${progressPct}%`, background: 'rgba(255,255,255,0.9)', pointerEvents: 'none' }}
            />
          </div>

          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Click the timeline to seek · Red = low eye contact · Amber = moderate · Green = strong
          </p>
        </div>
      )}
    </div>
  )
}
