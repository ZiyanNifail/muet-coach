'use client'
import { GraduationCap, Headphones, PenLine, Mic, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const PARTS = [
  {
    icon: Headphones,
    label: 'Part 1: Listening',
    detail: '30 questions across 3 sections · MCQ + fill-in-blank · Immediate result',
    time: '~40 min',
    color: '#3A7D6A',
  },
  {
    icon: PenLine,
    label: 'Part 2: Writing',
    detail: 'Task 1: Data description (150+ words) · Task 2: Argumentative essay (350+ words)',
    time: '90 min',
    color: '#7C5CBF',
  },
  {
    icon: Mic,
    label: 'Part 3: Speaking',
    detail: '2-minute preparation · 2-minute recorded delivery · AI coaching',
    time: '~5 min',
    color: '#D97706',
  },
]

export function ExamIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-10 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-teal-dim)' }}
        >
          <GraduationCap size={20} style={{ color: 'var(--accent-teal)' }} />
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Full Mock Exam
          </p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>MUET Combined Exam</h1>
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        This is a full MUET practice exam covering all three assessed components: Listening, Writing, and Speaking.
        Complete all three parts in sequence. Your results will be compiled into a single report with an overall band score.
      </p>

      {/* Parts */}
      <div className="flex flex-col gap-3">
        {PARTS.map((p, i) => {
          const Icon = p.icon
          return (
            <div
              key={p.label}
              className="rounded-xl border p-4 flex flex-col sm:flex-row gap-4 items-start"
              style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
            >
              <div
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
                style={{ background: `${p.color}15` }}
              >
                <Icon size={17} style={{ color: p.color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.label}</p>
                  <div className="flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                    <Clock size={11} />
                    <span className="text-xs">{p.time}</span>
                  </div>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{p.detail}</p>
              </div>
              <div
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: p.color }}
              >
                {i + 1}
              </div>
            </div>
          )
        })}
      </div>

      {/* Warnings */}
      <div
        className="rounded-xl border p-4 flex flex-col gap-1.5"
        style={{ background: 'rgba(245,198,100,0.10)', borderColor: 'rgba(245,198,100,0.30)' }}
      >
        <p className="text-xs font-semibold" style={{ color: 'var(--accent-amber)' }}>Before you begin</p>
        <ul className="text-xs list-disc list-inside flex flex-col gap-1" style={{ color: 'var(--text-secondary)' }}>
          <li>Find a quiet place. You will need to speak aloud for Part 3.</li>
          <li>Ensure your microphone and camera are working.</li>
          <li>You cannot skip parts or restart once the exam begins.</li>
          <li>A transition screen appears between each part. Take a short break if needed.</li>
          <li>The Writing test has a 90-minute timer that starts automatically.</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <Button onClick={onStart} className="w-full sm:w-auto min-h-[44px]">
          <GraduationCap size={14} className="mr-2" />
          Start Full Exam
        </Button>
      </div>
    </div>
  )
}
