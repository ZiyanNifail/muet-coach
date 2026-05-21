'use client'
import { Headphones, Info, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const SECTIONS = [
  { label: 'Section A', detail: '10 questions · Short dialogues & announcements · MCQ · Audio plays twice' },
  { label: 'Section B', detail: '10 questions · Extended conversation · Fill in the blank · Audio plays twice' },
  { label: 'Section C', detail: '10 questions · Academic monologue · MCQ & fill-in-blank · Audio plays once' },
]

export function ListeningIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-10 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-teal-dim)' }}
        >
          <Headphones size={20} style={{ color: 'var(--accent-teal)' }} />
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            MUET Component 1
          </p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Listening Test</h1>
        </div>
      </div>

      <div
        className="rounded-2xl border p-5 flex flex-col gap-4"
        style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
      >
        <div className="flex items-center gap-2">
          <Info size={14} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Test Format</p>
        </div>

        <div className="flex flex-col gap-3">
          {SECTIONS.map((s) => (
            <div key={s.label} className="flex gap-3">
              <div
                className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-teal-dim)' }}
              >
                <PlayCircle size={12} style={{ color: 'var(--accent-teal)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl border p-4 flex flex-col gap-1"
        style={{ background: 'rgba(245,198,100,0.10)', borderColor: 'rgba(245,198,100,0.30)' }}
      >
        <p className="text-xs font-semibold" style={{ color: 'var(--accent-amber)' }}>Before you start</p>
        <ul className="text-xs flex flex-col gap-1 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          <li>Audio is read aloud using your browser&apos;s text-to-speech. Ensure your volume is on.</li>
          <li>You cannot skip sections or go back once a section begins.</li>
          <li>Section C audio plays only once. Listen carefully before pressing Play.</li>
          <li>Submit each section when you have answered all questions.</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <Button onClick={onStart} className="w-full sm:w-auto min-h-[44px]">
          <Headphones size={14} className="mr-2" />
          Start Listening Test
        </Button>
      </div>
    </div>
  )
}
