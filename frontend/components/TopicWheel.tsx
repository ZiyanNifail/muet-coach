'use client'
import { useState, useEffect, useRef } from 'react'
import { RefreshCw, ArrowRight } from 'lucide-react'
import { Button } from './ui/Button'
import { supabase } from '@/lib/supabase'

interface Topic {
  id: string
  topic: string
  category: string
}

const FALLBACK_TOPICS: Topic[] = [
  { id: '1', topic: 'Education in Malaysia', category: 'education' },
  { id: '2', topic: 'Climate Change & Environment', category: 'environment' },
  { id: '3', topic: 'Social Media and Society', category: 'technology' },
  { id: '4', topic: 'Health and Wellness', category: 'health' },
  { id: '5', topic: 'Technology in the Workplace', category: 'technology' },
  { id: '6', topic: 'Youth Unemployment', category: 'economy' },
  { id: '7', topic: 'Public Transportation', category: 'social' },
  { id: '8', topic: 'Mental Health Awareness', category: 'health' },
  { id: '9', topic: 'Online Learning', category: 'education' },
  { id: '10', topic: 'Food Security', category: 'social' },
  { id: '11', topic: 'Renewable Energy', category: 'environment' },
  { id: '12', topic: 'Digital Economy', category: 'economy' },
  { id: '13', topic: 'Cultural Diversity in Malaysia', category: 'social' },
  { id: '14', topic: 'Urbanisation Challenges', category: 'social' },
  { id: '15', topic: 'English Proficiency Among Youth', category: 'education' },
]

const ITEM_H = 56
const VISIBLE = 5

interface TopicWheelProps {
  onSelect: (topic: Topic) => void
}

function computeOffset(topicsLen: number, idx: number) {
  // Center the item at `idx` in the middle copy of the repeated list
  const startCopy = topicsLen
  return -(startCopy + idx) * ITEM_H + Math.floor(VISIBLE / 2) * ITEM_H
}

export function TopicWheel({ onSelect }: TopicWheelProps) {
  const [topics, setTopics] = useState<Topic[]>(FALLBACK_TOPICS)

  // Pick a valid random index at initialisation time so the wheel is never blank
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

    const idx = Math.floor(Math.random() * topics.length)
    const duration = 1600 + Math.random() * 900

    // Briefly remove transition so it can be re-applied cleanly
    setAnimate(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimate(true)
        setSelectedIdx(idx)
        setOffset(computeOffset(topics.length, idx))
        setSpinning(true)
        spinTimeout.current = setTimeout(() => setSpinning(false), duration)
      })
    })
  }

  // Fetch live topics from Supabase, then auto-spin once loaded (WARN-05 fix)
  useEffect(() => {
    supabase
      .from('muet_topics')
      .select('id, topic, category')
      .eq('active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const t = data as Topic[]
          setTopics(t)
          const idx = Math.floor(Math.random() * t.length)
          setSelectedIdx(idx)
          setOffset(computeOffset(t.length, idx))
        }
        // Auto-spin once after topics are ready (or after mount with fallback topics)
        setTimeout(() => spin(), 80)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (spinTimeout.current) clearTimeout(spinTimeout.current)
    }
  }, [])

  // Middle copy index of the selected topic
  const centerIdx = topics.length + selectedIdx

  // Repeated list: 3 copies for seamless visual scroll
  const repeated = [...topics, ...topics, ...topics]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(20px)' }}
    >
      <div
        className="w-full max-w-lg flex flex-col gap-5 rounded-2xl border p-6"
        style={{
          background: 'rgba(14,14,22,0.55)',
          borderColor: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Header */}
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
              color: '#55556a',
            }}
          >
            Selecting your topic
          </span>
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
          {/* Selection highlight band */}
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

          {/* Top gradient fade */}
          <div
            className="absolute inset-x-0 top-0 pointer-events-none z-10"
            style={{
              height: ITEM_H * 2.2,
              background: 'linear-gradient(to bottom, rgba(10,10,18,0.92) 0%, transparent 100%)',
            }}
          />
          {/* Bottom gradient fade */}
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
            style={{
              height: ITEM_H * 2.2,
              background: 'linear-gradient(to top, rgba(10,10,18,0.92) 0%, transparent 100%)',
            }}
          />

          {/* Scrolling items */}
          <div
            style={{
              transform: `translateY(${offset}px)`,
              transition: animate
                ? `transform 2200ms cubic-bezier(0.15, 0.85, 0.4, 1)`
                : 'none',
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
                    color: isSelected ? '#e8e8f0' : '#3a3a52',
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

        <p
          style={{ fontSize: 11, color: '#44445a', textAlign: 'center', letterSpacing: '0.02em' }}
        >
          Topics are drawn from the MUET topic bank
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={spin} disabled={spinning}>
            <RefreshCw size={14} className="mr-2" />
            {spinning ? 'Spinning...' : 'Spin Again'}
          </Button>
          <Button onClick={() => onSelect(topics[selectedIdx])} disabled={spinning}>
            Use This Topic
            <ArrowRight size={14} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
