'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { RubricBands } from '@/components/RubricPanel'

interface SessionPoint {
  session_date: string
  feedback_reports: {
    band_score: number | null
    wpm_avg: number | null
    eye_contact_pct: number | null
    filler_count: number | null
    posture_score: number | null
    generated_at: string | null
  } | null
}

const DRILLS: Record<string, { title: string; drills: string[] }> = {
  eye_contact: {
    title: 'Eye Contact',
    drills: [
      'Place a sticky note at camera level — speak to it for 2 minutes without looking away.',
      'Record a 60-second practice and count how many times you glance away from the camera.',
      'Use the "triangle technique": alternate gaze between the camera and two fixed points every 5 seconds.',
    ],
  },
  pace: {
    title: 'Speaking Pace',
    drills: [
      'Read a paragraph aloud targeting 130–150 WPM — use a metronome app to calibrate your speed.',
      'Mark pause points in your script with a slash ("/") and hold for 1 full second at each.',
      'Record a 90-second topic summary, check your WPM, then re-record adjusting your speed.',
    ],
  },
  filler_words: {
    title: 'Filler Words',
    drills: [
      'Replace fillers with a silent 2-second pause — practice answering questions this way daily.',
      'Record a 1-minute speech; replay it and count every "um/uh". Set a target to halve the count.',
      'Do a "filler tally" drill: mark a tally on paper each time you say a filler during practice.',
    ],
  },
  posture: {
    title: 'Posture & Body Language',
    drills: [
      'Stand with your back against a flat wall for 2 minutes daily to build straight-spine muscle memory.',
      'Record yourself presenting — check that shoulders are level and your head is not tilted.',
      'Practice at a standing desk or lectern to maintain a consistent presenter posture.',
    ],
  },
  band_score: {
    title: 'Overall Band Score',
    drills: [
      'Pick one HIGH-impact advice card from your last session and practise addressing it for 10 minutes.',
      'Do a 2-minute impromptu talk on a random topic — use a clear intro, 3 main points, and a close.',
      'Review your transcript and rewrite 3 sentences where you could express ideas more clearly.',
    ],
  },
  task_fulfilment: {
    title: 'Task Fulfilment',
    drills: [
      'Pick any topic and speak for 90 seconds: introduction (15s), 3 main points (60s), conclusion (15s). Stay on-topic throughout.',
      'Before speaking, write a 3-point outline in 30 seconds — then deliver it strictly. Re-record if you deviate.',
      'Make a claim, then support it with 2 specific examples. Record 60 seconds per claim — no vague statements.',
    ],
  },
  coherence_cohesion: {
    title: 'Coherence & Cohesion',
    drills: [
      'Speak for 90 seconds on any topic using at least 5 discourse markers: firstly, furthermore, however, as a result, in conclusion.',
      'Summarise a news article in 2 minutes. Every new sentence must begin with a connective (therefore, however, in addition).',
      'Every time you feel the urge to say "um" or "uh", replace it with a silent 2-second pause. Count your pauses afterward.',
    ],
  },
  lexical_resource: {
    title: 'Lexical Resource',
    drills: [
      'Choose 5 words you overuse (good, bad, thing, very, said). Find 2 precise alternatives for each, then use them in sentences.',
      'Give a 90-second speech, then identify 3 basic words you used. Re-record the same speech replacing them with higher-band alternatives.',
      'Pick a MUET topic. List 10 topic-specific collocations in 2 minutes, then use at least 5 of them in a 90-second talk.',
    ],
  },
  grammatical_range_accuracy: {
    title: 'Grammatical Range & Accuracy',
    drills: [
      'Describe an issue for 90 seconds: past tense for what happened, present perfect for impact, conditional for implications.',
      'In a 90-second speech, every 3 sentences include one complex sentence using although, which, despite, or provided that.',
      'Give your opinion on a MUET topic for 90 seconds. Use at least two conditional structures (one first, one second/third conditional).',
    ],
  },
  pronunciation: {
    title: 'Pronunciation',
    drills: [
      'Practise these word pairs slowly then at speed: ship/sheep, wet/vet, thin/tin, three/tree, leave/live. Record and compare.',
      'Say these words with correct stress: pho-TO-graph, pho-TOG-ra-phy, de-VE-lop, DE-ve-lop-ment. Use each in a sentence. Repeat 3×.',
      'Find a 1-minute English news clip. Listen once, then shadow it word-by-word, matching the speaker\'s rhythm and stress.',
    ],
  },
}

const RUBRIC_CRITERIA_KEYS = [
  'task_fulfilment',
  'coherence_cohesion',
  'lexical_resource',
  'grammatical_range_accuracy',
  'pronunciation',
] as const

function findWeakestMetric(sessions: SessionPoint[], rubricBands?: RubricBands): string {
  // Prefer rubric bands from the latest session — more precise than history heuristics
  if (rubricBands) {
    let worst = 'band_score'
    let worstScore = Infinity
    for (const key of RUBRIC_CRITERIA_KEYS) {
      const band = rubricBands[key]
      if (band && band.score < worstScore) {
        worstScore = band.score
        worst = key
      }
    }
    if (worst !== 'band_score') return worst
  }

  // Fall back to history-based heuristics
  const recent = sessions.slice(0, 5)
  const scores: Record<string, number[]> = {
    eye_contact: [],
    pace: [],
    filler_words: [],
    posture: [],
  }

  for (const s of recent) {
    const r = s.feedback_reports
    if (!r) continue
    if (r.eye_contact_pct != null) scores.eye_contact.push(r.eye_contact_pct)
    if (r.wpm_avg != null) scores.pace.push(Math.max(0, 100 - Math.abs(r.wpm_avg - 140) * 1.5))
    if (r.filler_count != null) scores.filler_words.push(Math.max(0, 100 - r.filler_count * 5))
    if (r.posture_score != null) scores.posture.push(r.posture_score)
  }

  let worstMetric = 'band_score'
  let worstAvg = Infinity

  for (const [key, vals] of Object.entries(scores)) {
    if (vals.length === 0) continue
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    if (avg < worstAvg) {
      worstAvg = avg
      worstMetric = key
    }
  }

  return worstMetric
}

export function LearningPathPanel({ studentId, rubricBands }: { studentId: string; rubricBands?: RubricBands }) {
  const [sessions, setSessions] = useState<SessionPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/reports/history/${studentId}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        )
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions || [])
        }
      } catch { /* non-fatal */ }
      setLoading(false)
    })
  }, [studentId])

  // Show if we have rubric bands (no history needed) or if history is loaded with ≥2 sessions
  if (!rubricBands && (loading || sessions.length < 2)) return null

  const metric = findWeakestMetric(sessions, rubricBands)
  const { title, drills } = DRILLS[metric]
  const sessionCount = Math.min(sessions.length, 5)
  const isRubricDriven = !!rubricBands && RUBRIC_CRITERIA_KEYS.includes(metric as typeof RUBRIC_CRITERIA_KEYS[number])

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-5"
      style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(139,92,246,0.25)' }}
    >
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b5cf6' }}>
          LEARNING PATH
        </div>
        <span
          className="text-xs rounded-full px-2.5 py-0.5"
          style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          Focus: {title}
        </span>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {isRubricDriven
          ? <>Based on your MUET rubric breakdown, your lowest criterion is{' '}<span style={{ color: '#c4b5fd' }}>{title}</span>. Here are 3 targeted drills.</>
          : <>Based on your last {sessionCount} session{sessionCount > 1 ? 's' : ''}, your weakest area is{' '}<span style={{ color: '#c4b5fd' }}>{title}</span>. Here are 3 targeted drills.</>
        }
      </p>

      <div className="flex flex-col gap-2">
        {drills.map((drill, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-lg border p-3"
            style={{ background: 'rgba(180,165,148,0.04)', borderColor: 'rgba(139,92,246,0.1)' }}
          >
            <span
              className="shrink-0 font-mono text-xs font-bold mt-0.5"
              style={{ color: '#8b5cf6', opacity: 0.7 }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{drill}</p>
          </div>
        ))}
      </div>

      <Link href="/practice" className="text-xs self-start mt-1" style={{ color: '#8b5cf6' }}>
        Start a practice session →
      </Link>
    </div>
  )
}
