'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Briefcase, BarChart2, Megaphone, Code2, FlaskConical, ArrowRight, Loader2 } from 'lucide-react'
import { getAuthHeaders } from '@/lib/supabase'
import { staggerContainer, staggerItem } from '@/lib/motion'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const ROLES = [
  {
    key: 'software_engineer',
    label: 'Software Engineer',
    description: 'System design, coding practices, debugging, SOLID principles, and technical problem-solving.',
    icon: Code2,
    color: '#6366f1',
  },
  {
    key: 'data_analyst',
    label: 'Data Analyst',
    description: 'Data pipelines, SQL, visualisation, stakeholder communication, and analytical thinking.',
    icon: BarChart2,
    color: '#0ea5e9',
  },
  {
    key: 'data_science',
    label: 'Data Scientist',
    description: 'Machine learning, model evaluation, feature engineering, and statistical reasoning.',
    icon: FlaskConical,
    color: '#10b981',
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Campaign strategy, ROI measurement, digital trends, and brand storytelling.',
    icon: Megaphone,
    color: '#f59e0b',
  },
]

export default function InterviewSelectPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startInterview() {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/interview/start`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_role: selected }),
      })
      if (!res.ok) throw new Error('Failed to start interview')
      const data = await res.json()
      sessionStorage.setItem(`interview_init_${data.session_id}`, JSON.stringify({
        question_text: data.question_text,
        question_index: 0,
        total_questions: data.total_questions,
        job_role: selected,
      }))
      router.push(`/interview/${data.session_id}`)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 44, height: 44, background: 'var(--accent-teal-dim)' }}
          >
            <Briefcase size={22} style={{ color: 'var(--accent-teal)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mock Interview</h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>AI-powered interview practice with real-time feedback</p>
          </div>
        </div>

        <p className="mt-6 mb-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Choose the role you are interviewing for
        </p>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6"
        >
          {ROLES.map((role) => {
            const Icon = role.icon
            const isSelected = selected === role.key
            return (
              <motion.button
                key={role.key}
                variants={staggerItem}
                onClick={() => setSelected(role.key)}
                className="text-left rounded-xl p-4 border transition-all"
                style={{
                  background: isSelected ? `${role.color}15` : 'var(--bg-surface)',
                  borderColor: isSelected ? role.color : 'var(--border-subtle)',
                  boxShadow: isSelected ? `0 0 0 2px ${role.color}40` : 'none',
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="flex items-center justify-center rounded-lg"
                    style={{ width: 34, height: 34, background: `${role.color}20` }}
                  >
                    <Icon size={17} style={{ color: role.color }} />
                  </div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {role.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  {role.description}
                </p>
              </motion.button>
            )
          })}
        </motion.div>

        {error && (
          <p className="text-sm mb-4 text-center" style={{ color: '#ef4444' }}>{error}</p>
        )}

        <button
          onClick={startInterview}
          disabled={!selected || loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm transition-all"
          style={{
            background: selected && !loading ? 'var(--accent-teal)' : 'var(--bg-surface)',
            color: selected && !loading ? '#fff' : 'var(--text-tertiary)',
            border: '1px solid var(--border-subtle)',
            cursor: selected && !loading ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Preparing your interview room…</>
          ) : (
            <><ArrowRight size={16} /> Enter Interview Room</>
          )}
        </button>

        <p className="mt-4 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
          7 questions · ~10 minutes · AI-powered feedback report
        </p>
      </motion.div>
    </div>
  )
}
