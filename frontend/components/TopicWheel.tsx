'use client'
import { useState, useEffect, useRef } from 'react'
import { RefreshCw, ArrowRight, X } from 'lucide-react'
import { Button } from './ui/Button'
import { supabase } from '@/lib/supabase'

interface Topic {
  id: string
  topic: string
  category: string
}

const FALLBACK_TOPICS: Topic[] = [
  { id: '1', topic: 'How effective is the Malaysian education system in preparing students for the modern workforce?', category: 'education' },
  { id: '2', topic: 'What steps should Malaysia take to combat climate change and protect its natural environment?', category: 'environment' },
  { id: '3', topic: 'How is social media negatively impacting the mental health and social behaviour of Malaysian youth?', category: 'technology' },
  { id: '4', topic: 'Why should promoting a healthy lifestyle be made a national priority among young Malaysians?', category: 'health' },
  { id: '5', topic: 'How is the rise of artificial intelligence transforming the workplace and what skills do workers need to adapt?', category: 'technology' },
  { id: '6', topic: 'What are the root causes of youth unemployment in Malaysia and how can the government address them?', category: 'economy' },
  { id: '7', topic: 'To what extent does Malaysia\'s public transportation system meet the daily needs of its urban population?', category: 'social' },
  { id: '8', topic: 'Why is mental health awareness among university students a growing crisis that demands immediate action?', category: 'health' },
  { id: '9', topic: 'Has the shift to online learning improved or worsened the quality of education for Malaysian students?', category: 'education' },
  { id: '10', topic: 'How can Malaysia ensure long-term food security for its growing population in the face of climate change?', category: 'social' },
  { id: '11', topic: 'Should Malaysia invest more heavily in renewable energy to reduce its dependence on fossil fuels?', category: 'environment' },
  { id: '12', topic: 'How can Malaysian graduates position themselves to thrive in the rapidly evolving digital economy?', category: 'economy' },
  { id: '13', topic: 'How does Malaysia\'s cultural diversity strengthen its national identity and drive economic growth?', category: 'social' },
  { id: '14', topic: 'What are the most pressing challenges brought about by rapid urbanisation in Malaysian cities today?', category: 'social' },
  { id: '15', topic: 'Why is improving English proficiency among Malaysian youth critical for their future career success?', category: 'education' },
]

const ITEM_H = 56
const VISIBLE = 5

interface TopicWheelProps {
  onSelect: (topic: Topic) => void
  onClose?: () => void
}

function computeOffset(topicsLen: number, idx: number) {
  const startCopy = topicsLen
  return -(startCopy + idx) * ITEM_H + Math.floor(VISIBLE / 2) * ITEM_H
}

export function TopicWheel({ onSelect, onClose }: TopicWheelProps) {
  const [topics, setTopics] = useState<Topic[]>(FALLBACK_TOPICS)
  // Keep a ref always in sync so spin() closures always see the latest topics
  const topicsRef = useRef<Topic[]>(FALLBACK_TOPICS)

  const [selectedIdx, setSelectedIdx] = useState(() =>
    Math.floor(Math.random() * FALLBACK_TOPICS.length)
  )
  const [spinning, setSpinning] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [offset, setOffset] = useState(() =>
    computeOffset(FALLBACK_TOPICS.length, Math.floor(Math.random() * FALLBACK_TOPICS.length))
  )
  const spinTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function spin() {
    if (spinning) return
    if (spinTimeout.current) clearTimeout(spinTimeout.current)

    const currentTopics = topicsRef.current
    const idx = Math.floor(Math.random() * currentTopics.length)
    const duration = 1600 + Math.random() * 900

    setAnimate(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimate(true)
        setSelectedIdx(idx)
        setOffset(computeOffset(currentTopics.length, idx))
        setSpinning(true)
        spinTimeout.current = setTimeout(() => setSpinning(false), duration)
      })
    })
  }

  // Fetch live topics — update ref first so the delayed spin() sees the right length
  useEffect(() => {
    supabase
      .from('muet_topics')
      .select('id, topic, category')
      .eq('active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const t = data as Topic[]
          topicsRef.current = t
          setTopics(t)
          const idx = Math.floor(Math.random() * t.length)
          setSelectedIdx(idx)
          setOffset(computeOffset(t.length, idx))
        }
        setTimeout(() => spin(), 80)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (spinTimeout.current) clearTimeout(spinTimeout.current)
    }
  }, [])

  const centerIdx = topics.length + selectedIdx
  const repeated = [...topics, ...topics, ...topics]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)' }}
    >
      <div
        className="w-full max-w-lg flex flex-col gap-5 rounded-2xl border p-6"
        style={{
          background: 'var(--bg-panel)',
          borderColor: 'var(--border-medium)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          transition: 'background 0.3s ease, color 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
                animation: 'pulse 2s ease-in-out infinite',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Selecting your topic
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Wheel */}
        <div
          className="relative overflow-hidden rounded-xl"
          style={{
            height: ITEM_H * VISIBLE,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div
            className="absolute inset-x-0 pointer-events-none z-10"
            style={{
              top: Math.floor(VISIBLE / 2) * ITEM_H,
              height: ITEM_H,
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(148,163,184,0.06)',
            }}
          />
          <div
            className="absolute inset-x-0 top-0 pointer-events-none z-10"
            style={{
              height: ITEM_H * 2.2,
              background: 'linear-gradient(to bottom, var(--bg-panel) 0%, transparent 100%)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
            style={{
              height: ITEM_H * 2.2,
              background: 'linear-gradient(to top, var(--bg-panel) 0%, transparent 100%)',
            }}
          />

          <div
            style={{
              transform: `translateY(${offset}px)`,
              transition: animate ? `transform 2200ms cubic-bezier(0.15, 0.85, 0.4, 1)` : 'none',
            }}
          >
            {repeated.map((topic, i) => {
              const isSelected = i === centerIdx
              return (
                <div
                  key={`${topic.id}-${i}`}
                  className="flex items-center justify-center px-8 text-center"
                  style={{
                    height: ITEM_H,
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    opacity: isSelected ? 1 : 0.5,
                    filter: isSelected ? 'none' : 'blur(1.5px)',
                    fontSize: isSelected ? 15 : 13,
                    fontWeight: isSelected ? 500 : 400,
                    letterSpacing: isSelected ? '0.01em' : '0.02em',
                    transition: 'color 0.4s ease, font-size 0.4s ease, filter 0.4s ease, opacity 0.4s ease',
                    userSelect: 'none',
                  }}
                >
                  {topic.topic}
                </div>
              )
            })}
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', letterSpacing: '0.02em' }}>
          Topics are drawn from the MUET topic bank
        </p>

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={spin} disabled={spinning}>
            <RefreshCw size={14} className="mr-2" />
            {spinning ? 'Spinning...' : 'Spin Again'}
          </Button>
          <Button onClick={() => onSelect(topicsRef.current[selectedIdx])} disabled={spinning}>
            Use This Topic
            <ArrowRight size={14} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
