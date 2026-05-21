'use client'
import { PenLine, Clock, Info, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const TASKS = [
  {
    icon: FileText,
    label: 'Task 1: Data Description',
    detail: '~30 minutes · Minimum 150 words · Describe a graph, chart, or table objectively',
  },
  {
    icon: PenLine,
    label: 'Task 2: Argumentative Essay',
    detail: '~60 minutes · Minimum 350 words · Respond to a statement with developed arguments',
  },
]

export function WritingIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-10 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-teal-dim)' }}
        >
          <PenLine size={20} style={{ color: 'var(--accent-teal)' }} />
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            MUET Component 4
          </p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Writing Test</h1>
        </div>
      </div>

      <div
        className="rounded-2xl border p-5 flex flex-col gap-4"
        style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
      >
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>90 minutes total</p>
        </div>

        <div className="flex flex-col gap-3">
          {TASKS.map((t) => {
            const Icon = t.icon
            return (
              <div key={t.label} className="flex gap-3">
                <div
                  className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent-teal-dim)' }}
                >
                  <Icon size={11} style={{ color: 'var(--accent-teal)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div
        className="rounded-xl border p-4 flex flex-col gap-2"
        style={{ background: 'rgba(245,198,100,0.10)', borderColor: 'rgba(245,198,100,0.30)' }}
      >
        <div className="flex items-center gap-1.5">
          <Info size={13} style={{ color: 'var(--accent-amber)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--accent-amber)' }}>Before you start</p>
        </div>
        <ul className="text-xs flex flex-col gap-1 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          <li>The 90-minute countdown begins as soon as you click Begin.</li>
          <li>Both tasks will be displayed on the same screen. Scroll down to switch between them.</li>
          <li>Your responses are evaluated by AI using official MUET band descriptors.</li>
          <li>When the timer reaches zero, your test is automatically submitted.</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <Button onClick={onStart} className="w-full sm:w-auto min-h-[44px]">
          <PenLine size={14} className="mr-2" />
          Begin Writing Test
        </Button>
      </div>
    </div>
  )
}
