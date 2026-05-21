'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BookOpen, FileText, Clock, CheckCircle, ClipboardList, ExternalLink, Star, CalendarClock, Bell } from 'lucide-react'

interface Assignment {
  id: string
  title: string
  description: string
  deadline: string | null
  exam_mode: boolean
  slide_required: boolean
  scheduled_at: string | null
  exam_duration_mins: number | null
}

interface ExamInvitation {
  id: string
  assignment_id: string
  status: 'pending' | 'accepted' | 'declined'
  invited_at: string
  assignments: {
    id: string
    title: string
    scheduled_at: string | null
    exam_duration_mins: number | null
    course_id: string
    courses: { name: string } | null
  } | null
}

interface AssignmentStatus {
  assignment_id: string
  presentation_id: string
  status: string
  grade_released: boolean
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
  const router = useRouter()
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
  // assignmentId → submission status
  const [assignmentStatuses, setAssignmentStatuses] = useState<Record<string, AssignmentStatus>>({})
  const [examInvitations, setExamInvitations] = useState<ExamInvitation[]>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [examStatuses, setExamStatuses] = useState<Record<string, { presentation_id: string; grade_released: boolean }>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const authHdr = await getAuthHeaders()
      const session = (await supabase.auth.getSession()).data.session
      tokenRef.current = session?.access_token ?? ''

      try {
        const res = await fetch(`${API_URL}/api/courses/student/${user.id}`, { headers: authHdr })
        if (res.ok) {
          const data = await res.json()
          const memberships: Membership[] = data.memberships || []
          setMemberships(memberships)

          // Fetch assignments + submission statuses for all approved courses in parallel
          const approved = memberships.filter((m) => m.status === 'approved' && m.courses?.id)
          if (approved.length > 0) {
            const [assignResults, statusResults] = await Promise.all([
              Promise.all(
                approved.map((m) =>
                  fetch(`${API_URL}/api/courses/${m.courses!.id}/assignments`, { headers: authHdr })
                    .then((r) => r.ok ? r.json() : { assignments: [] })
                    .catch(() => ({ assignments: [] })),
                ),
              ),
              Promise.all(
                approved.map((m) =>
                  fetch(`${API_URL}/api/courses/${m.courses!.id}/my-assignment-status`, { headers: authHdr })
                    .then((r) => r.ok ? r.json() : { statuses: [] })
                    .catch(() => ({ statuses: [] })),
                ),
              ),
            ])
            const assignMap: Record<string, Assignment[]> = {}
            const statusMap: Record<string, AssignmentStatus> = {}
            approved.forEach((m, i) => {
              assignMap[m.courses!.id] = assignResults[i].assignments || []
              for (const s of (statusResults[i].statuses || [])) {
                statusMap[s.assignment_id] = s
              }
            })
            setCourseAssignments(assignMap)
            setAssignmentStatuses(statusMap)
          }
        }

        // Fetch exam invitations + submission statuses
        try {
          const [invRes, statusRes] = await Promise.all([
            fetch(`${API_URL}/api/exams/my-invitations`, { headers: authHdr }),
            fetch(`${API_URL}/api/exams/my-exam-statuses`, { headers: authHdr }),
          ])
          if (invRes.ok) setExamInvitations((await invRes.json()).invitations || [])
          if (statusRes.ok) {
            const list = (await statusRes.json()).statuses || []
            const map: Record<string, { presentation_id: string; grade_released: boolean }> = {}
            for (const s of list) map[s.assignment_id] = { presentation_id: s.presentation_id, grade_released: s.grade_released }
            setExamStatuses(map)
          }
        } catch {}
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
      setJoinMsg('Could not connect. Check your internet connection.')
    } finally {
      setJoining(false)
    }
  }

  async function handleRespondInvite(invitationId: string, status: 'accepted' | 'declined') {
    setRespondingId(invitationId)
    try {
      const authHdr = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/exams/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setExamInvitations(prev => prev.map(i => i.id === invitationId ? { ...i, status } : i))
      }
    } catch {}
    setRespondingId(null)
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
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>
          COURSES
        </div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>My Courses</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Join a course using an invite code from your educator.
        </p>
      </div>

      {/* Join course */}
      <div
        className="flex flex-col gap-4 rounded-xl border p-5"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
      >
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          JOIN A COURSE
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter invite code (e.g. BEL311-X7K2)"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="flex-1 rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors font-mono"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <Button onClick={handleJoin} disabled={!inviteCode.trim() || joining} className="min-h-[44px] sm:min-h-0">
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
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            PENDING REQUESTS
          </div>
          {pending.map((m) => (
            <div key={m.id} className="flex items-center gap-4 rounded-xl border p-4"
              style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)' }}>
              <Clock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.courses?.name}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>{m.courses?.subject_code}</span>
              </div>
              <Badge variant="amber">Request Pending</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Pending exam invitations */}
      {examInvitations.filter(i => i.status === 'pending').length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f59e0b' }}>
            <Bell size={12} />
            EXAM INVITATIONS ({examInvitations.filter(i => i.status === 'pending').length})
          </div>
          {examInvitations.filter(i => i.status === 'pending').map(inv => (
            <div key={inv.id} className="flex flex-col sm:flex-row sm:items-start gap-4 rounded-xl border p-4"
              style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.20)' }}>
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <CalendarClock size={16} style={{ color: '#f59e0b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{inv.assignments?.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{inv.assignments?.courses?.name}</div>
                  {inv.assignments?.scheduled_at && (
                    <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                      <CalendarClock size={10} />
                      {new Date(inv.assignments.scheduled_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
                      {inv.assignments.exam_duration_mins && ` · ${inv.assignments.exam_duration_mins} min`}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <button
                  onClick={() => handleRespondInvite(inv.id, 'accepted')}
                  disabled={respondingId === inv.id}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all min-h-[44px]"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRespondInvite(inv.id, 'declined')}
                  disabled={respondingId === inv.id}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all min-h-[44px]"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming exams — accepted, not yet submitted */}
      {(() => {
        const upcoming = examInvitations.filter(i => i.status === 'accepted' && !examStatuses[i.assignment_id])
        if (upcoming.length === 0) return null
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3A7D6A' }}>UPCOMING EXAMS</div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(58,125,106,0.12)', color: '#3A7D6A' }}>{upcoming.length}</span>
            </div>
            {upcoming.map(inv => (
              <div key={inv.id} className="flex items-start gap-4 rounded-xl border p-4"
                style={{ background: 'rgba(58,125,106,0.04)', borderColor: 'rgba(58,125,106,0.20)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(58,125,106,0.10)' }}>
                  <CalendarClock size={16} style={{ color: '#3A7D6A' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold break-words" style={{ color: 'var(--text-primary)' }}>{inv.assignments?.title}</div>
                  {inv.assignments?.scheduled_at && (
                    <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <CalendarClock size={10} />
                      {new Date(inv.assignments.scheduled_at).toLocaleString('en-MY', { dateStyle: 'long', timeStyle: 'short' })}
                      {inv.assignments.exam_duration_mins && <span style={{ color: 'var(--text-tertiary)' }}>· {inv.assignments.exam_duration_mins} min</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/practice?assignment_id=${inv.assignment_id}&mode=exam`)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all shrink-0"
                  style={{ background: 'rgba(58,125,106,0.10)', border: '1px solid rgba(58,125,106,0.25)', color: '#3A7D6A' }}
                >
                  <CalendarClock size={12} /> Join Exam
                </button>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Completed exams — submitted, pending marks or marks released */}
      {(() => {
        const completed = examInvitations.filter(i => i.status === 'accepted' && !!examStatuses[i.assignment_id])
        if (completed.length === 0) return null
        return (
          <div className="flex flex-col gap-3">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>COMPLETED EXAMS</div>
            {completed.map(inv => {
              const sub = examStatuses[inv.assignment_id]
              return (
                <div key={inv.id} className="flex items-start gap-4 rounded-xl border p-4"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--bg-surface)' }}>
                    <CalendarClock size={16} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold break-words" style={{ color: 'var(--text-primary)' }}>{inv.assignments?.title}</div>
                    {inv.assignments?.scheduled_at && (
                      <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                        <CalendarClock size={10} />
                        {new Date(inv.assignments.scheduled_at).toLocaleString('en-MY', { dateStyle: 'long', timeStyle: 'short' })}
                        {inv.assignments.exam_duration_mins && <span>· {inv.assignments.exam_duration_mins} min</span>}
                      </div>
                    )}
                  </div>
                  {sub.grade_released ? (
                    <button
                      onClick={() => router.push(`/results/${sub.presentation_id}`)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all shrink-0"
                      style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.30)', color: '#8b5cf6' }}
                    >
                      <Star size={12} /> View Marks
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shrink-0"
                      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)', color: '#d97706' }}>
                      <Clock size={12} /> Pending Marks
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Enrolled courses */}
      <div className="flex flex-col gap-3">
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          ENROLLED COURSES {approved.length > 0 && `(${approved.length})`}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-28 rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</span>
          </div>
        ) : approved.length === 0 ? (
          <div className="flex items-center justify-center h-28 rounded-xl border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>You are not enrolled in any courses yet.</p>
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
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', transition: 'background 0.3s ease' }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(34,197,94,0.10)' }}>
                    <BookOpen size={18} style={{ color: '#22c55e' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{course.name}</span>
                      <Badge variant="blue">{course.subject_code}</Badge>
                      <Badge variant="green">Enrolled</Badge>
                    </div>
                    {course.users && (
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Educator: {course.users.full_name}</p>
                    )}
                  </div>
                </div>

                {/* Course actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                      <FileText size={12} /> No rubric uploaded yet
                    </span>
                  )}
                  <span className="text-xs sm:ml-auto flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                    <CheckCircle size={11} style={{ color: '#22c55e' }} />
                    Enrolled {new Date(m.requested_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                  </span>
                </div>

                {/* Assignments */}
                {(() => {
                  const assignments = courseAssignments[course.id]
                  if (!assignments) return null
                  return (
                    <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                        ASSIGNMENTS {assignments.length > 0 && `(${assignments.length})`}
                      </div>
                      {assignments.length === 0 ? (
                        <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                          <ClipboardList size={12} /> No assignments yet
                        </span>
                      ) : (
                        assignments.map((a) => {
                          const sub = assignmentStatuses[a.id]
                          const isPastDeadline = a.deadline ? new Date() > new Date(a.deadline) : false
                          const examInv = a.exam_mode
                            ? examInvitations.find(i => i.assignment_id === a.id)
                            : undefined
                          const examAccepted = examInv?.status === 'accepted'
                          return (
                            <div key={a.id} className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
                              style={{
                                background: a.exam_mode ? 'rgba(245,158,11,0.03)' : 'rgba(180,165,148,0.04)',
                                borderColor: a.exam_mode ? 'rgba(245,158,11,0.18)' : 'rgba(180,165,148,0.22)',
                              }}>
                              {a.exam_mode
                                ? <CalendarClock size={13} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                                : <ClipboardList size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 1 }} />
                              }
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{a.title}</span>
                                  {a.exam_mode && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                                      style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                                      EXAM
                                    </span>
                                  )}
                                  {a.slide_required && <Badge variant="blue">Slides required</Badge>}
                                  {isPastDeadline && !sub && !a.exam_mode && <Badge variant="red">Closed</Badge>}
                                </div>
                                {a.description && (
                                  <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{a.description}</p>
                                )}
                                {a.exam_mode && a.scheduled_at && (
                                  <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                                    <CalendarClock size={10} />
                                    {new Date(a.scheduled_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
                                    {a.exam_duration_mins && ` · ${a.exam_duration_mins} min`}
                                  </p>
                                )}
                                {!a.exam_mode && a.deadline && (
                                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                    Due: {new Date(a.deadline).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                                  </p>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center">
                                {sub?.grade_released ? (
                                  <button
                                    onClick={() => router.push(`/results/${sub.presentation_id}`)}
                                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6' }}
                                  >
                                    <Star size={11} /> View Grade
                                  </button>
                                ) : sub ? (
                                  <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                                    {a.exam_mode
                                      ? <><Clock size={11} style={{ color: '#f59e0b' }} /> Pending review</>
                                      : <><CheckCircle size={11} style={{ color: '#22c55e' }} /> Submitted</>
                                    }
                                  </span>
                                ) : a.exam_mode ? (
                                  examAccepted ? (
                                    <button
                                      onClick={() => router.push(`/practice?assignment_id=${a.id}&mode=exam`)}
                                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                                      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#d97706' }}
                                    >
                                      <CalendarClock size={11} /> Join Exam
                                    </button>
                                  ) : examInv?.status === 'declined' ? (
                                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Declined</span>
                                  ) : (
                                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Not invited</span>
                                  )
                                ) : !isPastDeadline ? (
                                  <button
                                    onClick={() => router.push(`/practice?assignment_id=${a.id}`)}
                                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                                    style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#d97706' }}
                                  >
                                    Start Recording →
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          )
                        })
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
