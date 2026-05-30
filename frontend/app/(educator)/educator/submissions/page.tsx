'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { FileCheck, ChevronRight, BookOpen, GraduationCap, ArrowLeft } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/motion'

interface Submission {
  id: string
  status: string
  session_mode: string
  uploaded_at: string
  users: { full_name: string; email: string } | null
  feedback_reports: { band_score: number | null } | { band_score: number | null }[] | null
  assignments: { title: string; exam_mode?: boolean } | null
  source: 'course' | 'exam'
  course_id?: string
  course_name?: string
  course_subject_code?: string
  exam_title?: string
}

interface Course { id: string; name: string; subject_code: string }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getBand(sub: Submission): number | null {
  if (!sub.feedback_reports) return null
  const rep = Array.isArray(sub.feedback_reports) ? sub.feedback_reports[0] : sub.feedback_reports
  return rep?.band_score ?? null
}

export default function AllSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const authHdr = await getAuthHeaders()

      try {
        // ── Course submissions ──────────────────────────────────────────────
        const coursesRes = await fetch(`${API_URL}/api/courses?educator_id=${user.id}`, { headers: authHdr })
        const courseList: Course[] = coursesRes.ok ? ((await coursesRes.json()).courses || []) : []
        setCourses(courseList)

        const courseSubs = (await Promise.all(
          courseList.map(async (c) => {
            try {
              const res = await fetch(`${API_URL}/api/courses/${c.id}/submissions`, { headers: authHdr })
              if (!res.ok) return []
              const data = await res.json()
              return (data.submissions || []).map((s: Omit<Submission, 'source' | 'course_id' | 'course_name' | 'course_subject_code'>) => ({
                ...s,
                source: 'course' as const,
                course_id: c.id,
                course_name: c.name,
                course_subject_code: c.subject_code,
              }))
            } catch { return [] }
          })
        )).flat()

        // ── MUET Exam submissions ───────────────────────────────────────────
        let examSubs: Submission[] = []
        try {
          const examRes = await fetch(`${API_URL}/api/exams/all-submissions`, { headers: authHdr })
          if (examRes.ok) {
            const examData = await examRes.json()
            examSubs = (examData.submissions || []).map((s: Omit<Submission, 'source'>) => ({
              ...s,
              source: 'exam' as const,
              exam_title: s.assignments?.title || 'MUET Exam',
            }))
          }
        } catch {}

        const all = [...courseSubs, ...examSubs].sort(
          (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        )
        setSubmissions(all)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const filtered = submissions.filter((s) => {
    if (filterType !== 'all' && s.source !== filterType) return false
    if (filterCourse !== 'all' && s.course_id !== filterCourse) return false
    if (filterStatus !== 'all' && s.status !== filterStatus) return false
    return true
  })

  const statusVariant = (status: string) => {
    if (status === 'complete') return 'green' as const
    if (status === 'failed') return 'red' as const
    return 'amber' as const
  }

  // Link: course subs go to course-scoped review, exam subs go via /educator/courses/exam/submissions/[sid]
  function submissionHref(sub: Submission): string {
    if (sub.source === 'exam') return `/educator/courses/exam/submissions/${sub.id}`
    return `/educator/courses/${sub.course_id}/submissions/${sub.id}`
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/educator/dashboard">
          <button className="mt-1 text-[var(--text-secondary)] hover:text-[#c08830] transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4 }}>
            MANAGE
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">All Submissions</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Review and override AI assessments across all your courses and MUET exams.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-tertiary)] font-semibold">Type</span>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setFilterCourse('all') }}
            className="rounded-lg border px-3 py-1.5 text-xs outline-none transition-colors"
            style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: 'var(--text-primary)', colorScheme: 'dark' }}
          >
            <option value="all">All Types</option>
            <option value="course">Course</option>
            <option value="exam">MUET Exam</option>
          </select>
        </div>
        {filterType !== 'exam' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)] font-semibold">Course</span>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-xs outline-none transition-colors"
              style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: 'var(--text-primary)', colorScheme: 'dark' }}
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.subject_code} — {c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-tertiary)] font-semibold">Status</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-xs outline-none transition-colors"
            style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: 'var(--text-primary)', colorScheme: 'dark' }}
          >
            <option value="all">All Statuses</option>
            <option value="complete">Complete</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <span className="text-xs text-[var(--text-tertiary)] ml-auto">
          {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40 rounded-xl border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
          <span className="text-[var(--text-tertiary)] text-sm">Loading submissions...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl border gap-3"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
          <FileCheck size={28} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[var(--text-tertiary)] text-sm">
            {submissions.length === 0 ? 'No submissions yet across your courses or exams.' : 'No submissions match the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex flex-col gap-0 min-w-[680px]">
            {/* Table header */}
            <div
              className="grid grid-cols-12 gap-3 px-4 py-2.5"
              style={{ background: 'rgba(180,165,148,0.06)', borderBottom: '1px solid var(--border-subtle)' }}
            >
              {['STUDENT', 'SOURCE', 'EXAM / ASSIGNMENT', 'BAND', 'STATUS', 'DATE', ''].map((h, i) => (
                <div
                  key={i}
                  className={`text-[9px] font-bold tracking-widest uppercase text-[var(--text-tertiary)] ${
                    i === 0 ? 'col-span-3' : i === 1 ? 'col-span-2' : i === 2 ? 'col-span-2' : i === 3 ? 'col-span-1' : i === 4 ? 'col-span-1' : i === 5 ? 'col-span-2' : 'col-span-1'
                  }`}
                >
                  {h}
                </div>
              ))}
            </div>

            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            {filtered.map((sub, idx) => {
              const band = getBand(sub)
              return (
                <motion.div key={sub.id} variants={staggerItem}>
                <Link href={submissionHref(sub)} className="no-underline">
                  <div
                    className="grid grid-cols-12 gap-3 px-4 py-3.5 transition-colors cursor-pointer items-center"
                    style={{
                      borderTop: idx === 0 ? 'none' : '1px solid var(--border-subtle)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Student */}
                    <div className="col-span-3 min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {sub.users?.full_name || '—'}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] truncate">{sub.users?.email}</div>
                    </div>

                    {/* Source */}
                    <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                      {sub.source === 'exam' ? (
                        <>
                          <GraduationCap size={11} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold" style={{ color: '#8b5cf6' }}>MUET EXAM</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <BookOpen size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          <div className="min-w-0">
                            <div className="text-xs font-mono text-[#f59e0b]">{sub.course_subject_code}</div>
                            <div className="text-[11px] text-[var(--text-tertiary)] truncate">{sub.course_name}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Exam / Assignment title */}
                    <div className="col-span-2 min-w-0">
                      <span className="text-xs text-[var(--text-secondary)] truncate block">
                        {sub.source === 'exam'
                          ? (sub.exam_title || sub.assignments?.title || '—')
                          : (sub.assignments?.title || <span className="text-[var(--text-tertiary)] italic">Free practice</span>)
                        }
                      </span>
                      {sub.session_mode && (
                        <span className="text-[10px] text-[var(--text-tertiary)]">{sub.session_mode}</span>
                      )}
                    </div>

                    {/* Band */}
                    <div className="col-span-1">
                      <span className="font-mono text-sm font-semibold" style={{ color: band != null ? '#8b5cf6' : 'var(--text-tertiary)' }}>
                        {band != null ? band : '—'}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-xs text-[var(--text-tertiary)]">
                      {new Date(sub.uploaded_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                    </div>

                    {/* Arrow */}
                    <div className="col-span-1 flex justify-end">
                      <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                  </div>
                </Link>
                </motion.div>
              )
            })}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}
