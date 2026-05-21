'use client'
import { Task2Prompt } from '@/lib/writingPrompts'
import { Quote } from 'lucide-react'

interface Task2PanelProps {
  prompt: Task2Prompt
  value: string
  onChange: (val: string) => void
}

export function Task2Panel({ prompt, value, onChange }: Task2PanelProps) {
  const wc = value.trim().split(/\s+/).filter(Boolean).length
  const wcColor = wc >= 350 ? '#22c55e' : wc >= 200 ? '#f59e0b' : '#ef4444'

  return (
    <div
      className="rounded-2xl border flex flex-col gap-0 overflow-hidden"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div className="px-4 md:px-5 py-3 flex items-center justify-between" style={{ background: 'var(--accent-teal-dim)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Task 2: Argumentative Essay</p>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Min. 350 words</span>
      </div>

      <div className="px-4 md:px-5 py-4 flex flex-col gap-4" style={{ background: 'var(--bg-panel)', transition: 'background 0.3s ease' }}>
        <div
          className="rounded-xl border-l-4 px-4 py-3 flex gap-3"
          style={{ background: 'var(--accent-teal-dim)', borderLeftColor: 'var(--accent-teal)' }}
        >
          <Quote size={16} style={{ color: 'var(--accent-teal)', marginTop: 2 }} className="shrink-0" />
          <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-primary)' }}>{prompt.statement}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your essay here. Include an introduction, body paragraphs with supporting arguments, and a conclusion…"
            rows={14}
            className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(58,125,106,0.40)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
          />
          <div className="flex justify-end">
            <span className="text-xs font-medium" style={{ color: wcColor }}>
              {wc} word{wc !== 1 ? 's' : ''} {wc < 350 ? `(${350 - wc} more needed)` : '✓'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
