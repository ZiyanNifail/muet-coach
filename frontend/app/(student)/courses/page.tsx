'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BookOpen, FileText, Clock, CheckCircle, ClipboardList, ExternalLink } from 'lucide-react'

interface Assignment {
  id: string
  title: string
  description: string
  deadline: string | null
  exam_mode: boolean
}

interface Membership {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  courses: {
    id: string
    name: string
    subject_code: string
    invite_code: string
    rubric_path: string | null
    users: { full_name: string } | null
  } | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'


export default function CoursesPage() {
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinMsg, setJoinMsg] = useState<string | null>(null)
  const [joinError, setJoinError] = useState(false)

  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const tokenRef = useRef<string>('')

  // Rubric URL state: courseId → url | 'loading' | 'error'
  const [rubricUrls, setRubricUrls] = useState<Record<string, string | 'loading' | 'error'>>({})
  const [courseAssignments, setCourseAssignments] = useState<Record<string, Assignment[]>>({})

  useEffect(() => {
    async function load() {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const { data: { session } } = await sb.auth.getSession()
      tokenRef.current = session?.access_token ?? ''
      const authHdr: Record<string, string> = tokenRef.current
        ? { Authorization: `Bearer ${tokenRef.current}` } : {}

      try {
        const res = await fetch(`${API_URL}/api/courses/student/${user.id}`, { headers: authHdr })
        if (res.ok) {
          const data = await res.json()
          const memberships: Membership[] = data.memberships || []
          setMemberships(memberships)

          // Fetch assignments for all approved courses in parallel
          const approved = memberships.filter((m) => m.status === 'approved' && m.courses?.id)
          if (approved.length > 0) {
            const results = await Promise.all(
              approved.map((m) =>
                fetch(`${API_URL}/api/courses/${m.courses!.id}/assignments`, { headers: authHdr })
                  .then((r) => r.ok ? r.json() : { assignments: [] })
                  .catch(() => ({ assignments: [] })),
              ),
            )
            const map: Record<string, Assignment[]> = {}
            approved.forEach((m, i) => {
              map[m.courses!.id] = results[i].assignments || []
            })
            setCourseAssignments(map)
          }
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  async function handleJoin() {
    if (!inviteCode.trim() || !userId) return
    setJoining(true)
    setJoinMsg(null)
    setJoinError(false)
    const authHdr: Record<string, string> = tokenRef.current
      ? { Authorization: `Bearer ${tokenRef.current}` } : {}
    try {
      const res = await fetch(`${API_URL}/api/courses/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify({ student_id: userId, invite_code: inviteCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setJoinError(true); setJoinMsg(data.detail || 'Invalid code.'); return }
      setJoinMsg('Request sent! Your educator will approve your enrolment.')
      setInviteCode('')
      // Refresh memberships
      const r2 = await fetch(`${API_URL}/api/courses/student/${userId}`, { headers: authHdr })
      if (r2.ok) setMemberships((await r2.json()).memberships || [])
    } catch {
      setJoinError(true)
      setJoinMsg('Could not connect — check your internet connection.')
    } finally {
      setJoining(false)
    }
  }

  async function openRubric(courseId: string) {
    setRubricUrls((prev) => ({ ...prev, [courseId]: 'loading' }))
    try {
      const res = await fetch(`${API_URL}/api/courses/${courseId}/rubric-url`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      window.open(data.signed_url, '_blank')
      setRubricUrls((prev) => ({ ...prev, [courseId]: data.signed_url }))
    } catch {
      setRubricUrls((prev) => ({ ...prev, [courseId]: 'error' }))
    }
  }

  const approved = memberships.filter((m) => m.status === 'approved')
  const pending = memberships.filter((m) => m.status === 'pending')

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a', marginBottom: 4 }}>
          COURSES
        </div>
        <h1 className="text-2xl font-semibold text-[#e8e8f0]">My Courses</h1>
        <p className="text-[#8888a0] text-sm mt-1">
          Join a course using an invite code from your educator.
        </p>
      </div>

      {/* Join course */}
      <div
        className="flex flex-col gap-4 rounded-xl border p-5"
        style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
          JOIN A COURSE
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter invite code (e.g. BEL311-X7K2)"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="flex-1 rounded-lg border px-3.5 py-2.5 text-sm text-[#e8e8f0] outline-none transition-colors placeholder:text-[#55556a] font-mono"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.18)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <Button onClick={handleJoin} disabled={!inviteCode.trim() || joining}>
            {joining ? 'Sending...' : 'Request to Join'}
          </Button>
        </div>
        {joinMsg && (
          <p className={`text-sm ${joinError ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{joinMsg}</p>
        )}
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
            PENDING REQUESTS
          </div>
          {pending.map((m) => (
            <div key={m.id} className="flex items-center gap-4 rounded-xl border p-4"
              style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)' }}>
              <Clock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-[#e8e8f0]">{m.courses?.name}</span>
                <span className="text-xs text-[#55556a] ml-2">{m.courses?.subject_code}</span>
              </div>
              <Badge variant="amber">Request Pending</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Enrolled courses */}
      <div className="flex flex-col gap-3">
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
          ENROLLED COURSES {approved.length > 0 && `(${approved.length})`}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-28 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-[#55556a] text-sm">Loading...</span>
          </div>
        ) : approved.length === 0 ? (
          <div className="flex items-center justify-center h-28 rounded-xl border" style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[#55556a] text-sm">You are not enrolled in any courses yet.</p>
          </div>
        ) : (
          approved.map((m) => {
            const course = m.courses
            if (!course) return null
            const rubricState = rubricUrls[course.id]
            const hasRubric = !!course.rubric_path
            return (
              <div
                key={m.id}
                className="flex flex-col gap-4 rounded-xl border p-5"
                style={{ background: 'rgba(14,14,22,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(34,197,94,0.10)' }}>
                    <BookOpen size={18} style={{ color: '#22c55e' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-[#e8e8f0]">{course.name}</span>
                      <Badge variant="blue">{course.subject_code}</Badge>
                      <Badge variant="green">Enrolled</Badge>
                    </div>
                    {course.users && (
                      <p className="text-xs text-[#55556a]">Educator: {course.users.full_name}</p>
                    )}
                  </div>
                </div>

                {/* Course actions */}
                <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  {hasRubric ? (
                    <Button
                      variant="ghost"
                      onClick={() => openRubric(course.id)}
                      disabled={rubricState === 'loading'}
                    >
                      <FileText size={13} className="mr-1.5" />
                      {rubricState === 'loading' ? 'Opening...' : rubricState === 'error' ? 'Rubric unavailable' : 'View Rubric PDF'}
                      {rubricState !== 'loading' && rubricState !== 'error' && <ExternalLink size={11} className="ml-1.5 opacity-50" />}
                    </Button>
                  ) : (
                    <span className="text-xs text-[#3a3a52] flex items-center gap-1">
                      <FileText size={12} /> No rubric uploaded yet
                    </span>
                  )}
                  <span className="text-[#3a3a52] text-xs ml-auto flex items-center gap-1">
                    <CheckCircle size={11} style={{ color: '#22c55e' }} />
                    Enrolled {new Date(m.requested_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                  </span>
                </div>

                {/* Assignments */}
                {(() => {
                  const assignments = courseAssignments[course.id]
                  if (!assignments) return null
                  return (
                    <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#55556a' }}>
                        ASSIGNMENTS {assignments.length > 0 && `(${assignments.length})`}
                      </div>
                      {assignments.length === 0 ? (
                        <span className="text-xs text-[#3a3a52] flex items-center gap-1.5">
                          <ClipboardList size={12} /> No assignments yet
                        </span>
                      ) : (
                        assignments.map((a) => (
                          <div key={a.id} className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <ClipboardList size={13} style={{ color: '#8888a0', flexShrink: 0, marginTop: 1 }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-[#e8e8f0]">{a.title}</span>
                                {a.exam_mode && <Badge variant="amber">Exam Mode</Badge>}
                              </div>
                              {a.description && (
                                <p className="text-[11px] text-[#55556a] mt-0.5 line-clamp-2">{a.description}</p>
                              )}
                              {a.deadline && (
                                <p className="text-[11px] text-[#3a3a52] mt-0.5">
                                  Due: {new Date(a.deadline).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
