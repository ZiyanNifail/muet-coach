'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  PlusCircle, Users, BookOpen, Clock, ChevronRight,
  FileCheck, AlertCircle, BarChart2, CheckCircle,
} from 'lucide-react'

interface Course {
  id: string
  name: string
  subject_code: string
  invite_code: string
  description: string
  rubric_path: string | null
  created_at: string
  course_members: { count: number }[]
}

interface PendingItem {
  type: 'member' | 'submission'
  course_id: string
  course_name: string
  subject_code: string
  label: string
  detail: string
  href: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function EducatorDashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [recentSubs, setRecentSubs] = useState<{ id: string; course_id: string; student: string; band: number | null; date: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      try {
        const coursesRes = await fetch(`${API_URL}/api/courses?educator_id=${user.id}`)
        if (!coursesRes.ok) { setLoading(false); return }
        const courseList: Course[] = (await coursesRes.json()).courses || []
        setCourses(courseList)

        // For each course, load pending members + recent submissions in parallel
        const details = await Promise.all(
          courseList.map(async (c) => {
            const [membersRes, subsRes] = await Promise.all([
              fetch(`${API_URL}/api/courses/${c.id}/members`),
              fetch(`${API_URL}/api/courses/${c.id}/submissions`),
            ])
            const members = membersRes.ok ? ((await membersRes.json()).members || []) : []
            const subs = subsRes.ok ? ((await subsRes.json()).submissions || []) : []
            return { course: c, members, subs }
          })
        )

        const allPending: PendingItem[] = []
        const allSubs: typeof recentSubs = []

        for (const { course, members, subs } of details) {
          // Pending member requests
          for (const m of members) {
            if (m.status === 'pending') {
              allPending.push({
                type: 'member',
                course_id: course.id,
                course_name: course.name,
                subject_code: course.subject_code,
                label: m.users?.full_name || 'Unknown student',
                detail: 'requested to join',
                href: `/educator/courses/${course.id}`,
              })
            }
          }
          // Recent submissions (last 5 per course)
          for (const s of subs.slice(0, 5)) {
            const rep = Array.isArray(s.feedback_reports) ? s.feedback_reports[0] : s.feedback_reports
            allSubs.push({
              id: s.id,
              course_id: course.id,
              student: s.users?.full_name || '—',
              band: rep?.band_score ?? null,
              date: s.uploaded_at,
              status: s.status,
            })
          }
        }

        // Sort submissions newest first, keep top 8
        allSubs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setRecentSubs(allSubs.slice(0, 8))
        setPendingItems(allPending)
      } catch {}

      setLoading(false)
    }
    load()
  }, [])

  const totalStudents = courses.reduce((acc, c) => acc + (c.course_members?.[0]?.count ?? 0), 0)

  function bandColor(b: number | null) {
    if (b == null) return '#3a3a52'
    if (b >= 4.5) return '#22c55e'
    if (b >= 3.5) return '#3b82f6'
    if (b >= 2.5) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 4 }}>
            EDUCATOR PORTAL
          </div>
          <h1 className="text-2xl font-semibold text-[#e8e8f0]">Dashboard</h1>
          <p className="text-[#8888a0] text-sm mt-1">Overview of your courses, students, and submissions.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/educator/analytics">
            <Button variant="secondary">
              <BarChart2 size={14} className="mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/educator/courses/new">
            <Button>
              <PlusCircle size={14} className="mr-2" />
              New Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'COURSES', value: String(courses.length), icon: BookOpen, color: '#f59e0b' },
          { label: 'TOTAL STUDENTS', value: String(totalStudents), icon: Users, color: '#3b82f6' },
          { label: 'PENDING REQUESTS', value: String(pendingItems.length), icon: Clock, color: pendingItems.length > 0 ? '#ef4444' : '#22c55e' },
          { label: 'RECENT SUBMISSIONS', value: String(recentSubs.length), icon: FileCheck, color: '#8b5cf6' },
        ].map((m) => {
          const Icon = m.icon
          return (
            <div key={m.label} className="flex items-center gap-4 rounded-xl border p-4"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <Icon size={20} style={{ color: m.color, opacity: 0.7, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>{m.label}</div>
                <div className="font-mono text-xl font-semibold" style={{ color: m.color }}>{m.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left 2/3: courses + recent submissions */}
        <div className="col-span-2 flex flex-col gap-5">
          {/* My Courses */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 10 }}>
              MY COURSES
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-28 rounded-xl border"
                style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <span className="text-[#55556a] text-sm">Loading...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 rounded-xl border gap-4"
                style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <BookOpen size={24} style={{ color: '#55556a', opacity: 0.5 }} />
                <p className="text-[#55556a] text-sm">No courses yet.</p>
                <Link href="/educator/courses/new"><Button variant="secondary">Create First Course</Button></Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {courses.map((course) => (
                  <Link key={course.id} href={`/educator/courses/${course.id}`} className="no-underline">
                    <div className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:border-white/10 cursor-pointer"
                      style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(245,158,11,0.10)' }}>
                        <BookOpen size={16} style={{ color: '#f59e0b' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-[#e8e8f0] truncate">{course.name}</span>
                          <Badge variant="amber">{course.subject_code}</Badge>
                          {course.rubric_path && <Badge variant="green">Rubric</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#55556a]">
                          <span className="flex items-center gap-1">
                            <Users size={10} /> {course.course_members?.[0]?.count ?? 0} students
                          </span>
                          <span>Code: <code className="font-mono text-[#8888a0]">{course.invite_code}</code></span>
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: '#3a3a52', flexShrink: 0 }} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Submissions */}
          {recentSubs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
                  RECENT SUBMISSIONS
                </div>
                <Link href="/educator/submissions">
                  <span className="text-xs text-[#3b82f6] hover:underline cursor-pointer">View all</span>
                </Link>
              </div>
              <div className="rounded-xl border overflow-hidden"
                style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                {recentSubs.map((s, i) => (
                  <Link key={s.id} href={`/educator/courses/${s.course_id}/submissions/${s.id}`} className="no-underline">
                    <div className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-[#e8e8f0]">{s.student}</span>
                        <span className="text-xs text-[#55556a] ml-2">
                          {new Date(s.date).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                        </span>
                      </div>
                      <Badge variant={s.status === 'complete' ? 'green' : s.status === 'failed' ? 'red' : 'amber'}>
                        {s.status}
                      </Badge>
                      <span className="font-mono text-sm font-semibold w-10 text-right shrink-0"
                        style={{ color: bandColor(s.band) }}>
                        {s.band != null ? s.band.toFixed(1) : '—'}
                      </span>
                      <ChevronRight size={13} style={{ color: '#3a3a52' }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1/3: pending actions + quick links */}
        <div className="flex flex-col gap-4">
          {/* Pending actions */}
          <div className="flex flex-col gap-3 rounded-xl border p-4"
            style={{ background: 'rgba(14,14,22,0.45)', borderColor: pendingItems.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
                PENDING ACTIONS
              </div>
              {pendingItems.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: '#fff' }}>
                  {pendingItems.length}
                </span>
              )}
            </div>

            {pendingItems.length === 0 ? (
              <div className="flex items-center gap-2 py-2">
                <CheckCircle size={14} style={{ color: '#22c55e' }} />
                <span className="text-xs text-[#55556a]">All caught up!</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {pendingItems.slice(0, 6).map((item, i) => (
                  <Link key={i} href={item.href} className="no-underline">
                    <div className="flex items-start gap-2 rounded-lg p-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                      style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
                      <AlertCircle size={12} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#e8e8f0] truncate">{item.label}</div>
                        <div className="text-[10px] text-[#55556a]">{item.detail} · <span className="font-mono text-[#f59e0b]">{item.subject_code}</span></div>
                      </div>
                    </div>
                  </Link>
                ))}
                {pendingItems.length > 6 && (
                  <p className="text-[10px] text-[#3a3a52] text-center">+{pendingItems.length - 6} more</p>
                )}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-2 rounded-xl border p-4"
            style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 4 }}>
              QUICK ACTIONS
            </div>
            {[
              { label: 'Create a Course', href: '/educator/courses/new', icon: PlusCircle },
              { label: 'Review Submissions', href: '/educator/submissions', icon: FileCheck },
              { label: 'Class Analytics', href: '/educator/analytics', icon: BarChart2 },
              { label: 'Admin Panel', href: '/admin', icon: Users },
            ].map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.href} href={link.href} className="no-underline">
                  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-[#55556a] hover:text-[#8888a0] hover:bg-white/[0.03] transition-all cursor-pointer">
                    <Icon size={13} />
                    {link.label}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
