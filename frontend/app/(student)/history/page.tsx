'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { GitCompare, ExternalLink, Mic, Mic2, GraduationCap, Briefcase, PenLine, Headphones } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/motion'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SpeakingSession {
  id: string
  session_date: string
  report_id: string
  session_mode: string | null
  feedback_reports: {
    band_score: number | null
    wpm_avg: number | null
    eye_contact_pct: number | null
    posture_score: number | null
    filler_count: number | null
    generated_at: string | null
    presentation_id: string
  } | null
}

interface InterviewSession {
  id: string
  job_role: string
  overall_band: number | null
  completed: boolean
  created_at: string
}

interface WritingSession {
  id: string
  created_at: string
  task1_band: number | null
  task2_band: number | null
  overall_band: number | null
  task2_topic: string | null
}

interface ListeningSession {
  id: string
  created_at: string
  overall_band: number | null
  section_scores: {
    A: { correct: number; total: number }
    B: { correct: number; total: number }
    C: { correct: number; total: number }
  } | null
}

type TabKey = 'unguided' | 'guided' | 'exam' | 'interview' | 'writing' | 'listening'

const TABS: { key: TabKey; label: string; icon: React.ElementType; mode?: string }[] = [
  { key: 'unguided',  label: 'Unguided',   icon: Mic,           mode: 'unguided' },
  { key: 'guided',    label: 'Guided',     icon: Mic2,          mode: 'guided'   },
  { key: 'exam',      label: 'Mock Exam',  icon: GraduationCap, mode: 'exam'     },
  { key: 'interview', label: 'Interview',  icon: Briefcase                       },
  { key: 'writing',   label: 'Writing',    icon: PenLine                         },
  { key: 'listening', label: 'Listening',  icon: Headphones                      },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function bandLabel(score: number | null) {
  if (score == null) return '—'
  if (score >= 5.5) return 'Excellent'
  if (score >= 4.5) return 'Good'
  if (score >= 3.5) return 'Adequate'
  if (score >= 2.5) return 'Modest'
  if (score >= 1.5) return 'Limited'
  return 'Minimal'
}

function bandVariant(score: number | null): 'green' | 'blue' | 'amber' | 'red' {
  if (score == null) return 'red'
  if (score >= 5) return 'green'
  if (score >= 3.5) return 'blue'
  if (score >= 2.5) return 'amber'
  return 'red'
}

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmt(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-MY', { dateStyle: 'medium' })
}

function MetricDiff({ label, a, b, unit = '', lowerBetter = false }: {
  label: string; a: number | null; b: number | null; unit?: string; lowerBetter?: boolean
}) {
  if (a == null || b == null) return (
    <div className="flex flex-col gap-0.5">
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>—</span>
    </div>
  )
  const diff = b - a
  const improved = lowerBetter ? diff < 0 : diff > 0
  const color = diff === 0 ? 'var(--text-tertiary)' : improved ? '#22c55e' : '#ef4444'
  return (
    <div className="flex flex-col gap-0.5">
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{typeof a === 'number' ? a.toFixed(a % 1 ? 1 : 0) : a}{unit}</span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>→</span>
        <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{typeof b === 'number' ? b.toFixed(b % 1 ? 1 : 0) : b}{unit}</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {diff > 0 ? '+' : ''}{typeof diff === 'number' ? diff.toFixed(diff % 1 ? 1 : 0) : diff}{unit}
        </span>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabKey }) {
  const links: Record<TabKey, { href: string; label: string }> = {
    unguided:  { href: '/practice?mode=unguided', label: 'Start an unguided session'  },
    guided:    { href: '/practice?mode=guided',   label: 'Start a guided session'     },
    exam:      { href: '/exam',                   label: 'Take a full mock exam'      },
    interview: { href: '/interview',              label: 'Start a mock interview'     },
    writing:   { href: '/writing',               label: 'Start a writing session'    },
    listening: { href: '/listening',             label: 'Start a listening session'  },
  }
  const { href, label } = links[tab]
  return (
    <div className="flex flex-col items-center justify-center h-40 rounded-xl border gap-3"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No sessions yet for this type.</p>
      <Link href={href} className="text-sm hover:underline" style={{ color: 'var(--accent-teal)' }}>{label} →</Link>
    </div>
  )
}

// ── Speaking sessions table ────────────────────────────────────────────────────

function SpeakingTable({ sessions, comparing, selected, toggleSelect }: {
  sessions: SpeakingSession[]
  comparing: boolean
  selected: string[]
  toggleSelect: (id: string) => void
}) {
  return (
    <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--border-subtle)' }}>
      <div
        className="grid gap-4 px-5 py-3"
        style={{
          gridTemplateColumns: comparing ? 'auto 1fr auto auto auto auto' : '1fr auto auto auto auto',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
        }}
      >
        {comparing && <span>SEL</span>}
        <span>Date</span>
        <span>Band</span>
        <span>WPM</span>
        <span>Eye Contact</span>
        <span>View</span>
      </div>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {sessions.map((s, i) => {
          const r = s.feedback_reports
          const isSelected = selected.includes(s.id)
          const date = r?.generated_at || s.session_date
          return (
            <motion.div
              key={s.id}
              variants={staggerItem}
              className="grid gap-4 px-5 py-3.5 items-center transition-colors"
              style={{
                gridTemplateColumns: comparing ? 'auto 1fr auto auto auto auto' : '1fr auto auto auto auto',
                background: isSelected ? 'rgba(148,163,184,0.06)' : 'transparent',
                borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                cursor: comparing ? 'pointer' : 'default',
              }}
              onClick={() => comparing && toggleSelect(s.id)}
            >
              {comparing && (
                <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                  style={{ borderColor: isSelected ? '#94a3b8' : 'rgba(180,165,148,0.40)', background: isSelected ? '#94a3b8' : 'transparent' }}>
                  {isSelected && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                </div>
              )}
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fmt(date)}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {r?.band_score != null ? r.band_score.toFixed(1) : '—'}
                </span>
                {r?.band_score != null && <Badge variant={bandVariant(r.band_score)}>{bandLabel(r.band_score)}</Badge>}
              </div>
              <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                {r?.wpm_avg != null ? `${Math.round(r.wpm_avg)} wpm` : '—'}
              </span>
              <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                {r?.eye_contact_pct != null ? `${Math.round(r.eye_contact_pct)}%` : '—'}
              </span>
              {r?.presentation_id ? (
                <Link href={`/results/${r.presentation_id}`} className="flex items-center gap-1 text-xs hover:underline"
                  style={{ color: 'var(--text-tertiary)' }} onClick={e => e.stopPropagation()}>
                  <ExternalLink size={12} /> View
                </Link>
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
              )}
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

// ── Interview sessions table ───────────────────────────────────────────────────

function InterviewTable({ sessions }: { sessions: InterviewSession[] }) {
  return (
    <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--border-subtle)' }}>
      <div
        className="grid gap-4 px-5 py-3"
        style={{
          gridTemplateColumns: '1fr auto auto auto',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
        }}
      >
        <span>Date</span>
        <span>Role</span>
        <span>Band</span>
        <span>View</span>
      </div>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {sessions.map((s, i) => (
          <motion.div
            key={s.id}
            variants={staggerItem}
            className="grid gap-4 px-5 py-3.5 items-center"
            style={{
              gridTemplateColumns: '1fr auto auto auto',
              borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
            }}
          >
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fmt(s.created_at)}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{roleLabel(s.job_role)}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {s.overall_band != null ? s.overall_band.toFixed(1) : '—'}
              </span>
              {s.overall_band != null && <Badge variant={bandVariant(s.overall_band)}>{bandLabel(s.overall_band)}</Badge>}
            </div>
            {s.completed ? (
              <Link href={`/interview/${s.id}/results`} className="flex items-center gap-1 text-xs hover:underline"
                style={{ color: 'var(--text-tertiary)' }}>
                <ExternalLink size={12} /> View
              </Link>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Incomplete</span>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

// ── Writing sessions table ─────────────────────────────────────────────────────

function WritingTable({ sessions }: { sessions: WritingSession[] }) {
  return (
    <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--border-subtle)' }}>
      <div
        className="grid gap-4 px-5 py-3"
        style={{
          gridTemplateColumns: '1fr auto auto auto',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
        }}
      >
        <span>Date</span>
        <span>Task 1</span>
        <span>Task 2</span>
        <span>Overall</span>
      </div>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {sessions.map((s, i) => (
          <motion.div
            key={s.id}
            variants={staggerItem}
            className="grid gap-4 px-5 py-3.5 items-center"
            style={{ gridTemplateColumns: '1fr auto auto auto', borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}
          >
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fmt(s.created_at)}</span>
            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {s.task1_band != null ? s.task1_band.toFixed(1) : '—'}
            </span>
            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {s.task2_band != null ? s.task2_band.toFixed(1) : '—'}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {s.overall_band != null ? s.overall_band.toFixed(1) : '—'}
              </span>
              {s.overall_band != null && <Badge variant={bandVariant(s.overall_band)}>{bandLabel(s.overall_band)}</Badge>}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

// ── Listening sessions table ───────────────────────────────────────────────────

function ListeningTable({ sessions }: { sessions: ListeningSession[] }) {
  return (
    <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--border-subtle)' }}>
      <div
        className="grid gap-4 px-5 py-3"
        style={{
          gridTemplateColumns: '1fr auto auto auto auto',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
        }}
      >
        <span>Date</span>
        <span>Sec A</span>
        <span>Sec B</span>
        <span>Sec C</span>
        <span>Band</span>
      </div>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {sessions.map((s, i) => {
          const sec = s.section_scores
          return (
            <motion.div
              key={s.id}
              variants={staggerItem}
              className="grid gap-4 px-5 py-3.5 items-center"
              style={{ gridTemplateColumns: '1fr auto auto auto auto', borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fmt(s.created_at)}</span>
              <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                {sec?.A ? `${sec.A.correct}/${sec.A.total}` : '—'}
              </span>
              <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                {sec?.B ? `${sec.B.correct}/${sec.B.total}` : '—'}
              </span>
              <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                {sec?.C ? `${sec.C.correct}/${sec.C.total}` : '—'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {s.overall_band != null ? s.overall_band.toFixed(1) : '—'}
                </span>
                {s.overall_band != null && <Badge variant={bandVariant(s.overall_band)}>{bandLabel(s.overall_band)}</Badge>}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('unguided')
  const [allSpeaking, setAllSpeaking] = useState<SpeakingSession[]>([])
  const [interviews, setInterviews] = useState<InterviewSession[]>([])
  const [writingSessions, setWritingSessions] = useState<WritingSession[]>([])
  const [listeningSessions, setListeningSessions] = useState<ListeningSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        const headers = await getAuthHeaders()

        const [speakRes, intRes, wrRes, lisRes] = await Promise.all([
          fetch(`${API_URL}/api/reports/history/${user.id}`, { headers }),
          fetch(`${API_URL}/api/interview/sessions`, { headers }),
          fetch(`${API_URL}/api/writing/sessions`, { headers }),
          fetch(`${API_URL}/api/listening/sessions`, { headers }),
        ])

        if (speakRes.ok) {
          const d = await speakRes.json()
          setAllSpeaking(d.sessions || [])
        }
        if (intRes.ok) {
          const d = await intRes.json()
          setInterviews(d.sessions || [])
        }
        if (wrRes.ok) {
          const d = await wrRes.json()
          setWritingSessions(d.sessions || [])
        }
        if (lisRes.ok) {
          const d = await lisRes.json()
          setListeningSessions(d.sessions || [])
        }
      } catch {
        setError('Could not load session history.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const tabSessions = (mode: string) =>
    allSpeaking.filter(s => (s.session_mode || 'unguided') === mode)

  const activeSpeaking = (activeTab !== 'interview' && activeTab !== 'writing' && activeTab !== 'listening')
    ? tabSessions(activeTab === 'exam' ? 'exam' : activeTab)
    : []

  const sessionA = allSpeaking.find(s => s.id === selected[0])
  const sessionB = allSpeaking.find(s => s.id === selected[1])
  const rA = sessionA?.feedback_reports
  const rB = sessionB?.feedback_reports

  // Reset compare state when switching tabs
  function switchTab(tab: TabKey) {
    setActiveTab(tab)
    setComparing(false)
    setSelected([])
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
            PROGRESS
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Session History</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Review and compare all your past practice sessions.</p>
        </div>

        {/* Compare button — only for speaking tabs */}
        {activeTab !== 'interview' && activeTab !== 'writing' && activeTab !== 'listening' && activeSpeaking.length >= 2 && !comparing && (
          <Button variant="ghost" onClick={() => setComparing(true)} className="min-h-[44px]">
            <GitCompare size={14} className="mr-2" />
            Compare sessions
          </Button>
        )}
        {comparing && (
          <Button variant="ghost" onClick={() => { setComparing(false); setSelected([]) }} className="min-h-[44px]">
            ← Back
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const count = tab.key === 'interview'
            ? interviews.length
            : tab.key === 'writing'
            ? writingSessions.length
            : tab.key === 'listening'
            ? listeningSessions.length
            : tabSessions(tab.mode!).length
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: active ? 'var(--accent-teal)' : 'transparent',
                color: active ? '#fff' : 'var(--text-tertiary)',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.18)' : 'none',
              }}
            >
              <Icon size={12} strokeWidth={1.75} />
              {tab.label}
              {count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? 'rgba(255,255,255,0.22)' : 'var(--bg-surface)', color: active ? '#fff' : 'var(--text-tertiary)', minWidth: 18, textAlign: 'center' }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Comparison panel */}
      {comparing && selected.length === 2 && rA && rB && (
        <div className="rounded-xl border p-5 flex flex-col gap-5"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            SESSION COMPARISON
          </div>
          <div className="grid grid-cols-2 gap-4 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Session A</span>
              <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{fmt(rA.generated_at || sessionA?.session_date || null)}</p>
            </div>
            <div>
              <span style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Session B (latest)</span>
              <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{fmt(rB.generated_at || sessionB?.session_date || null)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <MetricDiff label="Band Score" a={rA.band_score} b={rB.band_score} />
            <MetricDiff label="Avg WPM" a={rA.wpm_avg != null ? Math.round(rA.wpm_avg) : null} b={rB.wpm_avg != null ? Math.round(rB.wpm_avg) : null} unit=" wpm" />
            <MetricDiff label="Eye Contact" a={rA.eye_contact_pct != null ? Math.round(rA.eye_contact_pct) : null} b={rB.eye_contact_pct != null ? Math.round(rB.eye_contact_pct) : null} unit="%" />
            <MetricDiff label="Filler Words" a={rA.filler_count} b={rB.filler_count} lowerBetter />
            <MetricDiff label="Posture Score" a={rA.posture_score != null ? Math.round(rA.posture_score) : null} b={rB.posture_score != null ? Math.round(rB.posture_score) : null} unit="/100" />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-32 rounded-xl border"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading sessions…</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 rounded-xl border"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'interview' ? (
              interviews.length === 0 ? (
                <EmptyState tab="interview" />
              ) : (
                <InterviewTable sessions={interviews} />
              )
            ) : activeTab === 'writing' ? (
              writingSessions.length === 0 ? (
                <EmptyState tab="writing" />
              ) : (
                <WritingTable sessions={writingSessions} />
              )
            ) : activeTab === 'listening' ? (
              listeningSessions.length === 0 ? (
                <EmptyState tab="listening" />
              ) : (
                <ListeningTable sessions={listeningSessions} />
              )
            ) : (
              activeSpeaking.length === 0 ? (
                <EmptyState tab={activeTab} />
              ) : (
                <SpeakingTable
                  sessions={activeSpeaking}
                  comparing={comparing}
                  selected={selected}
                  toggleSelect={toggleSelect}
                />
              )
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {comparing && selected.length < 2 && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Select 2 sessions from the list above to compare them ({selected.length}/2 selected).
        </p>
      )}
    </div>
  )
}
