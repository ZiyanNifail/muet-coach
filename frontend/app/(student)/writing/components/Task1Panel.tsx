'use client'
import { Task1Prompt } from '@/lib/writingPrompts'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

interface Task1PanelProps {
  prompt: Task1Prompt
  value: string
  onChange: (val: string) => void
}

const CHART_COLORS = ['#3A7D6A', '#5BA08A', '#7DBFAC', '#A8D5C9', '#C4E8E0', '#E0F4F1']

export function Task1Panel({ prompt, value, onChange }: Task1PanelProps) {
  const wc = value.trim().split(/\s+/).filter(Boolean).length
  const wcColor = wc >= 150 ? '#22c55e' : wc >= 100 ? '#f59e0b' : '#ef4444'

  function renderChart() {
    if (prompt.chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={prompt.chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} unit={prompt.unit.includes('%') ? '%' : ''} />
            <Tooltip formatter={(v) => [`${v} ${prompt.unit}`, '']} />
            <Bar dataKey="value" fill="var(--accent-teal)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    if (prompt.chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={prompt.chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
            <Tooltip formatter={(v) => [`${v} ${prompt.unit}`, '']} />
            <Line type="monotone" dataKey="value" stroke="var(--accent-teal)" strokeWidth={2} dot={{ fill: 'var(--accent-teal)', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )
    }
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={prompt.chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={85} label={({ label, value }) => `${label}: ${value}${prompt.unit}`} labelLine={false}>
            {prompt.chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [`${v} ${prompt.unit}`, '']} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div
      className="rounded-2xl border flex flex-col gap-0 overflow-hidden"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div className="px-4 md:px-5 py-3 flex items-center justify-between" style={{ background: 'var(--accent-teal-dim)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Task 1: Data Description</p>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Min. 150 words</span>
      </div>

      <div className="px-4 md:px-5 py-4 flex flex-col gap-4" style={{ background: 'var(--bg-panel)', transition: 'background 0.3s ease' }}>
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>{prompt.title}</p>
          {renderChart()}
          <p className="text-[11px] text-center mt-1" style={{ color: 'var(--text-tertiary)' }}>Unit: {prompt.unit}</p>
        </div>

        <p className="text-sm leading-relaxed p-3 rounded-lg" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
          {prompt.prompt}
        </p>

        <div className="flex flex-col gap-1.5">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your data description here…"
            rows={8}
            className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(58,125,106,0.40)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
          />
          <div className="flex justify-end">
            <span className="text-xs font-medium" style={{ color: wcColor }}>
              {wc} word{wc !== 1 ? 's' : ''} {wc < 150 ? `(${150 - wc} more needed)` : '✓'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
