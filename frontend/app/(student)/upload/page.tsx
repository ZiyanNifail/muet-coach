'use client'
import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileVideo, X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const MAX_BYTES = 500 * 1024 * 1024

function fmt(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDur(secs: number) {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [topic, setTopic] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  function pickFile(f: File) {
    setError(null)
    const isMp4 = f.type === 'video/mp4' || f.name.toLowerCase().endsWith('.mp4')
    if (!isMp4) { setError('Please select an MP4 file.'); return }
    if (f.size > MAX_BYTES) { setError(`File too large. Max 500 MB (yours is ${fmt(f.size)}).`); return }
    setFile(f)
    setDuration(null)
    const url = URL.createObjectURL(f)
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.onloadedmetadata = () => { setDuration(isFinite(vid.duration) ? vid.duration : null); URL.revokeObjectURL(url) }
    vid.src = url
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }, [])

  async function handleSubmit() {
    if (!file) return
    setError(null); setUploading(true); setProgress(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Session expired. Please log in again.'); setUploading(false); return }

      const fd = new FormData()
      fd.append('video', file)
      fd.append('student_id', session.user.id)
      fd.append('session_mode', 'upload')
      if (topic.trim()) fd.append('topic_text', topic.trim())
      if (duration != null) fd.append('duration_secs', String(Math.round(duration)))

      const data = await new Promise<{ presentation_id: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API_URL}/api/presentations/upload`)
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)) }
            catch { reject(new Error('Invalid server response')) }
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).detail || `Upload failed (${xhr.status})`)) }
            catch { reject(new Error(`Upload failed (${xhr.status})`)) }
          }
        }
        xhr.onerror = () => reject(new Error('Network error. Check your connection.'))
        xhr.send(fd)
      })

      router.push(`/results/${data.presentation_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setUploading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl">

      {/* Header */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
          UPLOAD MODE
        </div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Upload a Recorded Presentation</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Upload an existing MP4 and get full AI coaching: MUET band, rubric breakdown, gaze, fluency, and targeted drills.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 md:p-12 w-full cursor-pointer transition-all min-h-[160px]"
        style={{
          borderColor: dragging ? 'var(--accent-teal)' : file ? 'rgba(58,125,106,0.45)' : 'var(--border-medium)',
          background: dragging ? 'var(--accent-teal-dim)' : file ? 'rgba(58,125,106,0.03)' : 'var(--bg-surface)',
          transition: 'background 0.3s ease',
        }}
        onClick={() => { if (!file) inputRef.current?.click() }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {file ? (
          <>
            <CheckCircle size={36} style={{ color: '#3A7D6A' }} />
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {fmt(file.size)}{duration != null ? ` · ${fmtDur(duration)}` : ''}
              </span>
            </div>
            <button
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
              onClick={(e) => { e.stopPropagation(); setFile(null); setDuration(null); setError(null) }}
            >
              <X size={12} /> Remove file
            </button>
          </>
        ) : (
          <>
            <div
              className="flex items-center justify-center rounded-full w-16 h-16"
              style={{ background: 'rgba(58,125,106,0.09)' }}
            >
              <Upload size={26} style={{ color: '#3A7D6A' }} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {dragging ? 'Drop your video here' : 'Drag & drop your MP4 here'}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>or click to browse · MP4 · max 500 MB</span>
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".mp4,video/mp4"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }}
      />

      {/* Topic */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Presentation topic <span style={{ color: 'var(--text-tertiary)' }}>(optional, helps the AI give more relevant feedback)</span>
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. The impact of social media on Malaysian youth"
          maxLength={200}
          disabled={uploading}
          className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
          style={{
            borderColor: 'var(--border-medium)',
            background: 'var(--bg-panel)',
            color: 'var(--text-primary)',
            transition: 'background 0.3s ease',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)', color: 'var(--accent-red)' }}
        >
          {error}
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="flex flex-col gap-4 rounded-xl border p-5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)', transition: 'background 0.3s ease' }}>
          {progress < 100 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>Uploading video…</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress}%`, background: 'var(--accent-teal)' }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[
                { label: 'Uploading video',         done: true,  active: false },
                { label: 'Transcribing audio',      done: false, active: true  },
                { label: 'Analysing body language', done: false, active: false },
                { label: 'Generating feedback',     done: false, active: false },
              ].map(({ label, done, active }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      background: done ? 'var(--accent-teal-dim)' : active ? 'var(--accent-teal-dim)' : 'var(--bg-surface)',
                      border: `1px solid ${done ? 'rgba(58,125,106,0.35)' : active ? 'rgba(58,125,106,0.25)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    {done ? (
                      <span style={{ color: 'var(--accent-teal)', fontSize: 10, fontWeight: 700 }}>✓</span>
                    ) : active ? (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-teal)', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    ) : (
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--border-medium)', display: 'inline-block' }} />
                    )}
                  </div>
                  <span className="text-sm" style={{ color: done ? 'var(--accent-teal)' : active ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: active ? 500 : 400 }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Do not close this tab until analysis completes.
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button onClick={handleSubmit} disabled={!file || uploading} className="min-h-[44px]">
          <FileVideo size={14} className="mr-1.5" />
          {uploading ? 'Uploading…' : 'Analyse Presentation'}
        </Button>
        {!uploading && file && (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            You'll be redirected to results once analysis begins.
          </span>
        )}
      </div>

      {/* What gets analysed */}
      <div
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)', transition: 'background 0.3s ease' }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          WHAT GETS ANALYSED
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
          {[
            'MUET Band (1.0–6.0)',
            '5-Criterion Rubric',
            'Speaking Pace (WPM)',
            'Eye Contact %',
            'Filler Words',
            'Posture Score',
            'Pronunciation Clarity',
            'Vocabulary Range',
            'Targeted Drills',
          ].map((item) => (
            <div key={item} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>✓</span> {item}
            </div>
          ))}
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Analysis typically takes 1–3 minutes depending on video length.
        </p>
      </div>
    </div>
  )
}
