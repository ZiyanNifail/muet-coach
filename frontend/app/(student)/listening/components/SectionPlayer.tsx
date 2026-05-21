'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Volume2, VolumeX, ChevronRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ListeningQuestion } from '@/lib/listeningQuestions'
import { QuestionCard } from './QuestionCard'

interface SectionPlayerProps {
  section: 'A' | 'B' | 'C'
  questions: ListeningQuestion[]
  answers: Record<string, string>
  onAnswer: (id: string, value: string) => void
  onNext: () => void
  error?: string
}

const SECTION_META: Record<string, { label: string; description: string; maxPlays: number }> = {
  A: { label: 'Section A', description: 'Short dialogues & announcements (MCQ)', maxPlays: 2 },
  B: { label: 'Section B', description: 'Extended conversation (fill in the blank)', maxPlays: 2 },
  C: { label: 'Section C', description: 'Academic monologue (plays once only)', maxPlays: 1 },
}

interface PassageGroup {
  passage: string
  questions: ListeningQuestion[]
}

function PassagePlayer({
  passage, groupIndex, totalGroups, maxPlays, section,
}: {
  passage: string
  groupIndex: number
  totalGroups: number
  maxPlays: number
  section: string
}) {
  const [playCount, setPlayCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    return () => { window.speechSynthesis.cancel() }
  }, [])

  function play() {
    if (playCount >= maxPlays || isPlaying) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(passage)
    utt.rate = 0.85
    utt.pitch = 1
    utt.lang = 'en-GB'
    utt.onend = () => setIsPlaying(false)
    utt.onerror = () => setIsPlaying(false)
    utteranceRef.current = utt
    window.speechSynthesis.speak(utt)
    setIsPlaying(true)
    setPlayCount((p) => p + 1)
  }

  function stop() {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
  }

  const canPlay = playCount < maxPlays && !isPlaying
  const playsLeft = maxPlays - playCount

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
    >
      {totalGroups > 1 && (
        <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Audio {groupIndex + 1} of {totalGroups}
        </p>
      )}
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Listen to the audio passage, then answer the questions below.</p>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {isPlaying ? (
          <button
            onClick={stop}
            className="flex items-center gap-2 px-4 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto justify-center sm:justify-start min-h-[48px]"
            style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}
          >
            <VolumeX size={15} />
            Stop
          </button>
        ) : (
          <button
            onClick={play}
            disabled={!canPlay}
            className="flex items-center gap-2 px-4 rounded-lg text-sm font-medium transition-all w-full sm:w-auto justify-center sm:justify-start min-h-[48px]"
            style={
              canPlay
                ? { background: 'var(--accent-teal-dim)', color: 'var(--accent-teal)', cursor: 'pointer' }
                : { background: 'var(--bg-surface)', color: 'var(--text-tertiary)', cursor: 'not-allowed' }
            }
          >
            <Volume2 size={15} />
            {playCount === 0 ? 'Play Audio' : 'Play Again'}
          </button>
        )}

        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {isPlaying
            ? 'Playing…'
            : playCount === 0
            ? `Up to ${maxPlays} play${maxPlays > 1 ? 's' : ''} allowed`
            : playsLeft > 0
            ? `${playsLeft} play${playsLeft > 1 ? 's' : ''} remaining`
            : 'No more plays allowed'}
        </span>
      </div>

      {section === 'C' && playCount === 0 && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--accent-amber)' }}>
          <AlertCircle size={12} />
          This section plays only once. Be ready before pressing Play.
        </div>
      )}
    </div>
  )
}

export function SectionPlayer({ section, questions, answers, onAnswer, onNext, error }: SectionPlayerProps) {
  const meta = SECTION_META[section]
  const answered = questions.filter((q) => (answers[q.id] ?? '').trim() !== '').length
  const allAnswered = answered === questions.length

  const passageGroups = useMemo<PassageGroup[]>(() => {
    const groups: PassageGroup[] = []
    for (const q of questions) {
      const existing = groups.find((g) => g.passage === q.passage)
      if (existing) existing.questions.push(q)
      else groups.push({ passage: q.passage, questions: [q] })
    }
    return groups
  }, [questions])

  useEffect(() => {
    return () => { window.speechSynthesis.cancel() }
  }, [section])

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            {meta.label}
          </p>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{meta.description}</h2>
        </div>
        <div
          className="shrink-0 text-xs px-3 py-1 rounded-full font-medium"
          style={{ background: 'var(--accent-teal-dim)', color: 'var(--accent-teal)' }}
        >
          {answered}/{questions.length} answered
        </div>
      </div>

      {passageGroups.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-4">
          <PassagePlayer
            passage={group.passage}
            groupIndex={gi}
            totalGroups={passageGroups.length}
            maxPlays={meta.maxPlays}
            section={section}
          />
          <div className="flex flex-col gap-4">
            {group.questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={questions.indexOf(q)}
                value={answers[q.id] ?? ''}
                onChange={(val) => onAnswer(q.id, val)}
              />
            ))}
          </div>
        </div>
      ))}

      {error && (
        <div className="flex items-center gap-2 text-xs text-[#ef4444] rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!allAnswered} className="w-full sm:w-auto min-h-[44px]">
          {section === 'C' ? 'Submit Test' : `Next: Section ${section === 'A' ? 'B' : 'C'}`}
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  )
}
