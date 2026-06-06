'use client'
import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// On-demand Band 5 model answer for the session's topic. Fetched only when the
// student asks, so it costs nothing unless used.
export function ModelAnswerCard({ topic }: { topic: string | null | undefined }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [text, setText] = useState('')

  if (!topic) return null

  async function load() {
    setState('loading')
    try {
      const fd = new FormData()
      fd.append('topic', topic!)
      const res = await fetch(`${API_URL}/api/presentations/exemplar`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error('request failed')
      const data = await res.json()
      const exemplar = (data.exemplar || '').trim()
      if (!exemplar) throw new Error('empty')
      setText(exemplar)
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-5"
      style={{ background: 'var(--bg-panel)', borderColor: 'rgba(180,165,148,0.22)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          MODEL ANSWER
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Band 5 example</span>
      </div>

      {state === 'idle' && (
        <button
          onClick={load}
          className="flex items-center justify-center gap-2 self-start rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity"
          style={{ background: 'var(--accent-teal)' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Sparkles size={14} />
          See a model answer
        </button>
      )}

      {state === 'loading' && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <Loader2 size={14} className="animate-spin" />
          Writing a Band 5 example for your topic…
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col gap-2 items-start">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Could not generate a model answer right now.
          </p>
          <button onClick={load} className="text-sm font-medium" style={{ color: 'var(--accent-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Try again
          </button>
        </div>
      )}

      {state === 'done' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
            {text}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            Read it aloud to shadow the structure &amp; vocabulary — aim to match its flow, not memorise it.
          </p>
        </div>
      )}
    </div>
  )
}
