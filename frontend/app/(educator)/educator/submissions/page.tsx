'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { FileCheck, ChevronRight, BookOpen } from 'lucide-react'

interface Submission {
  id: string
  status: string
  session_mode: string
  uploaded_at: string
  users: { full_name: string; email: string } | null
  feedback_reports: { band_score: number | null } | { band_score: number | null }[] | null
  assignments: { title: string } | null
  course_id: string
  course_name: string
  course_subject_code: string
}

interface Course {
  id: string
  name: string
  subject_code: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getBand(sub: Submission): number | null {
  if (!sub.feedback_reports) return null
  const rep = Array.isArray(sub.feedback_reports)
    ? sub.feedback_reports[0]
    : sub.feedback_reports
  return rep?.band_score ?? null
}

export default function AllSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    async function load() {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      try {
        const coursesRes = await fetch(`${API_URL}/api/courses?educator_id=${user.id}`)
        if (!coursesRes.ok) { setLoading(false); return }
        const coursesData = await coursesRes.json()
        const courseList: Course[] = coursesData.courses || []
        setCourses(courseList)

        // Fetch submissions for each course in parallel
        const results = await Promise.all(
          courseList.map(async (c) => {
            try {
              const res = await fetch(`${API_URL}/api/courses/${c.id}/submissions`)
              if (!res.ok) return []
              const data = await res.json()
              return (data.submissions || []).map((s: Omit<Submission, 'course_id' | 'course_name' | 'course_subject_code'>) => ({
                ...s,
                course_id: c.id,
                course_name: c.name,
                course_subject_code: c.subject_code,
              }))
            } catch { return [] }
          })
        )
        const all = results.flat().sort(
          (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        )
        setSubmissions(all)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const filtered = submissions.filter((s) => {
    if (filterCourse !== 'all' && s.course_id !== filterCourse) return false
    if (filterStatus !== 'all' && s.status !== filterStatus) return false
    return true
  })

  const statusVariant = (status: string) => {
    if (status === 'complete') return 'green' as const
    if (status === 'failed') return 'red' as const
    return 'amber' as const
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 4 }}>
          REVIEWS
        </div>
        <h1 className="text-2xl font-semibold text-[#e8e8f0]">All Submissions</h1>
        <p className="text-[#8888a0] text-sm mt-1">
          Review and override AI assessments across all your courses.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#55556a] font-semibold">Course</span>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-xs outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#e8e8f0' }}
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.subject_code} — {c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#55556a] font-semibold">Status</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-xs outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#e8e8f0' }}
          >
            <option value="all">All Statuses</option>
            <option value="complete">Complete</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <span className="text-xs text-[#3a3a52] ml-auto">
          {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40 rounded-xl border" style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-[#55556a] text-sm">Loading submissions...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl border gap-3"
          style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <FileCheck size={28} style={{ color: '#55556a', opacity: 0.4 }} />
          <p className="text-[#55556a] text-sm">
            {submissions.length === 0 ? 'No submissions yet across your courses.' : 'No submissions match the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-0 rounded-xl border overflow-hidden"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Table header */}
          <div
            className="grid grid-cols-12 gap-3 px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {['STUDENT', 'COURSE', 'ASSIGNMENT', 'BAND', 'STATUS', 'DATE', ''].map((h, i) => (
              <div
                key={i}
                className={`text-[9px] font-bold tracking-widest uppercase text-[#3a3a52] ${
                  i === 0 ? 'col-span-3' : i === 1 ? 'col-span-2' : i === 2 ? 'col-span-2' : i === 3 ? 'col-span-1' : i === 4 ? 'col-span-1' : i === 5 ? 'col-span-2' : 'col-span-1'
                }`}
              >
                {h}
              </div>
            ))}
          </div>

          {filtered.map((sub, idx) => {
            const band = getBand(sub)
            return (
              <Link
                key={sub.id}
                href={`/educator/courses/${sub.course_id}/submissions/${sub.id}`}
                className="no-underline"
              >
                <div
                  className="grid grid-cols-12 gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02] cursor-pointer items-center"
                  style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                >
                  {/* Student */}
                  <div className="col-span-3 min-w-0">
                    <div className="text-sm font-semibold text-[#e8e8f0] truncate">
                      {sub.users?.full_name || '—'}
                    </div>
                    <div className="text-xs text-[#55556a] truncate">{sub.users?.email}</div>
                  </div>

                  {/* Course */}
                  <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                    <BookOpen size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-[#f59e0b]">{sub.course_subject_code}</div>
                      <div className="text-[11px] text-[#55556a] truncate">{sub.course_name}</div>
                    </div>
                  </div>

                  {/* Assignment */}
                  <div className="col-span-2 min-w-0">
                    <span className="text-xs text-[#8888a0] truncate block">
                      {sub.assignments?.title || <span className="text-[#3a3a52] italic">Free practice</span>}
                    </span>
                    {sub.session_mode && (
                      <span className="text-[10px] text-[#3a3a52]">{sub.session_mode}</span>
                    )}
                  </div>

                  {/* Band */}
                  <div className="col-span-1">
                    <span className="font-mono text-sm font-semibold" style={{ color: band != null ? '#8b5cf6' : '#3a3a52' }}>
                      {band != null ? band.toFixed(1) : '—'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-1">
                    <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 text-xs text-[#55556a]">
                    {new Date(sub.uploaded_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                  </div>

                  {/* Arrow */}
                  <div className="col-span-1 flex justify-end">
                    <ChevronRight size={14} style={{ color: '#3a3a52' }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
