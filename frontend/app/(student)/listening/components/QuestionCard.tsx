'use client'
import { ListeningQuestion } from '@/lib/listeningQuestions'

interface QuestionCardProps {
  question: ListeningQuestion
  index: number
  value: string
  onChange: (val: string) => void
}

export function QuestionCard({ question, index, value, onChange }: QuestionCardProps) {
  return (
    <div
      className="w-full rounded-xl border p-4 flex flex-col gap-3"
      style={{
        background: value ? 'var(--accent-teal-dim)' : 'var(--bg-panel)',
        borderColor: value ? 'rgba(58,125,106,0.25)' : 'var(--border-subtle)',
        transition: 'border-color 0.2s',
      }}
    >
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
        <span className="font-semibold mr-2" style={{ color: 'var(--accent-teal)' }}>{index + 1}.</span>
        {question.question}
      </p>

      {question.type === 'mcq' && question.options ? (
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => {
            const selected = value === opt
            return (
              <label
                key={opt}
                className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 text-sm transition-colors"
                style={{
                  background: selected ? 'var(--accent-teal-dim)' : 'var(--bg-surface)',
                  borderLeft: selected ? '3px solid #3A7D6A' : '3px solid transparent',
                }}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={opt}
                  checked={selected}
                  onChange={() => onChange(opt)}
                  className="accent-[#3A7D6A] w-4 h-4 shrink-0"
                />
                <span style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: selected ? 500 : 400 }}>{opt}</span>
              </label>
            )
          })}
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer here…"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg-surface)',
            borderColor: value ? 'rgba(58,125,106,0.35)' : 'var(--border-medium)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(58,125,106,0.50)')}
          onBlur={(e) => (e.target.style.borderColor = value ? 'rgba(58,125,106,0.35)' : 'var(--border-medium)')}
        />
      )}
    </div>
  )
}
