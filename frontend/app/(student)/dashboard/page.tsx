'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const metricCards = [
  {
    label: 'CURRENT BAND',
    value: '--',
    sub: 'No sessions yet',
    color: '#8b5cf6',
  },
  {
    label: 'PRACTICE HOURS',
    value: '0h',
    sub: 'Total time recorded',
    color: '#94a3b8',
  },
  {
    label: 'TOTAL SESSIONS',
    value: '0',
    sub: 'Completed sessions',
    color: '#22c55e',
  },
]

export default function DashboardPage() {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#55556a',
            marginBottom: 4,
          }}
        >
          OVERVIEW
        </div>
        <h1 className="text-2xl font-semibold text-[#e8e8f0]">Dashboard</h1>
        <p className="text-[#8888a0] text-sm mt-1">
          Track your presentation progress and start a new session.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="flex flex-col gap-1 rounded-lg border p-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: '#55556a',
              }}
            >
              {m.label}
            </span>
            <span
              className="font-mono text-2xl font-semibold"
              style={{ color: m.color }}
            >
              {m.value}
            </span>
            <span className="text-xs text-[#8888a0]">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* Start practice CTA */}
      <div
        className="flex flex-col gap-4 rounded-xl border p-6"
        style={{
          background: 'rgba(14,14,22,0.45)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#55556a',
                marginBottom: 4,
              }}
            >
              START PRACTICE
            </div>
            <h2 className="text-lg font-semibold text-[#e8e8f0]">Ready to practise?</h2>
            <p className="text-[#8888a0] text-sm mt-1">
              Choose a session mode and get AI-powered feedback on your presentation skills.
            </p>
          </div>
          <Badge variant="green">Available</Badge>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/practice?mode=unguided">
            <Button variant="secondary">Unguided Session</Button>
          </Link>
          <Link href="/practice?mode=guided">
            <Button>Guided Session →</Button>
          </Link>
        </div>
      </div>

      {/* Recent sessions */}
      <div
        className="flex flex-col gap-3 rounded-xl border p-6"
        style={{
          background: 'rgba(14,14,22,0.45)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#55556a',
          }}
        >
          RECENT SESSIONS
        </div>
        <div className="flex items-center justify-center h-20">
          <p className="text-[#55556a] text-sm">
            No sessions yet. Start your first practice session above.
          </p>
        </div>
      </div>
    </div>
  )
}
