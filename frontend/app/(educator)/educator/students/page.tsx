'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { GraduationCap, BookOpen, TrendingUp, ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react'

interface StudentOverview {
  student_id: string
  full_name: string
  email: string
  current_band: number | null
  highest_band: number | null
  courses: { id: string; name: string; subject_code: string }[]
}

interface PendingRow {
  member_id: string
  student_id: string
  full_name: string
  email: string
  course_id: string
  course_name: string
  subject_code: string
  requested_at: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentOverview[]>([])
  const [pending, setPending] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const tokenRef = useRef<string>('')
  const userIdRef = useRef<string>('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      userIdRef.current = user.id
      const authHdr = await getAuthHeaders()
      const session = (await supabase.auth.getSession()).data.session
      tokenRef.current = session?.access_token ?? ''

      try {
        const [overviewRes, coursesRes] = await Promise.all([
          fetch(`${API_URL}/api/courses/students-overview?educator_id=${user.id}`, { headers: authHdr }),
          fetch(`${API_URL}/api/courses?educator_id=${user.id}`, { headers: authHdr }),
        ])

        if (overviewRes.ok) {
          setStudents((await overviewRes.json()).students || [])
        }

        if (coursesRes.ok) {
          const courses = (await coursesRes.json()).courses || []
          const pendingRows: PendingRow[] = []
          await Promise.all(
            courses.map(async (c: { id: string; name: string; subject_code: string }) => {
              const res = await fetch(`${API_URL}/api/courses/${c.id}/members`, { headers: authHdr })
              if (!res.ok) return
              const mems = (await res.json()).members || []
              for (const m of mems) {
                if (m.status !== 'pending') continue
                pendingRows.push({
                  member_id: m.id,
                  student_id: m.student_id,
                  full_name: m.users?.full_name || '—',
                  email: m.users?.email || '—',
                  course_id: c.id,
                  course_name: c.name,
                  subject_code: c.subject_code,
                  requested_at: m.requested_at,
                })
              }
            })
          )
          setPending(pendingRows)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  async function handleAction(memberId: string, courseId: string, action: 'approve' | 'reject') {
    setActionId(memberId)
    const authHdr: Record<string, string> = tokenRef.current
      ? { Authorization: `Bearer ${tokenRef.current}` } : {}
    const res = await fetch(`${API_URL}/api/courses/${courseId}/members/${memberId}/${action}`, {
      method: 'POST', headers: authHdr,
    })
    if (res.ok) {
      setPending((prev) => prev.filter((m) => m.member_id !== memberId))
      if (action === 'approve') {
        // Refresh overview to pick up newly enrolled student
        const authHdr2 = await getAuthHeaders()
        const ov = await fetch(`${API_URL}/api/courses/students-overview?educator_id=${userIdRef.current}`, { headers: authHdr2 })
        if (ov.ok) setStudents((await ov.json()).students || [])
      }
    }
    setActionId(null)
  }

  const q = search.trim().toLowerCase()
  const filteredStudents = q
    ? students.filter(s => s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    : students
  const filteredPending = q
    ? pending.filter(p => p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    : pending

  function bandColor(band: number | null) {
    if (band === null) return '#9B8E80'
    if (band >= 5) return '#22c55e'
    if (band >= 4) return '#f59e0b'
    if (band >= 3) return '#94a3b8'
    return '#ef4444'
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/educator/dashboard">
            <button className="mt-1 text-[#6b6050] hover:text-[#c08830] transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6050', marginBottom: 4 }}>
              MANAGE
            </div>
            <h1 className="text-2xl font-semibold text-[#1C1A17]">Students</h1>
            <p className="text-[#6B6050] text-sm mt-1">All enrolled students across your courses.</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border px-3.5 py-2 text-sm outline-none placeholder:text-[#C4B8A8] w-full md:w-[260px]"
          style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: '#1C1A17' }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 rounded-xl border"
          style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}>
          <span className="text-[#9B8E80] text-sm">Loading...</span>
        </div>
      ) : (
        <>
          {/* Pending requests */}
          {filteredPending.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f59e0b' }}>
                  PENDING REQUESTS
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: '#fff' }}>
                  {filteredPending.length}
                </span>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(245,158,11,0.20)' }}>
                {filteredPending.map((m, i) => (
                  <div
                    key={m.member_id}
                    className="flex items-center gap-4 px-4 py-3"
                    style={{
                      background: 'rgba(245,158,11,0.03)',
                      borderTop: i === 0 ? 'none' : '1px solid rgba(245,158,11,0.08)',
                    }}
                  >
                    <Clock size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-[#1C1A17]">{m.full_name}</span>
                      <span className="text-xs text-[#9B8E80] ml-2">{m.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#9B8E80] mr-4">
                      <BookOpen size={11} style={{ color: '#f59e0b' }} />
                      <span className="font-mono text-[#f59e0b]">{m.subject_code}</span>
                      <span className="hidden sm:inline">{m.course_name}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAction(m.member_id, m.course_id, 'approve')}
                        disabled={actionId === m.member_id}
                        title="Approve"
                        className="rounded-lg p-1.5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        style={{ color: '#22c55e', background: 'rgba(34,197,94,0.08)' }}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => handleAction(m.member_id, m.course_id, 'reject')}
                        disabled={actionId === m.member_id}
                        title="Reject"
                        className="rounded-lg p-1.5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enrolled students table */}
          <div className="flex flex-col gap-3">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80' }}>
              ENROLLED STUDENTS {filteredStudents.length > 0 && `(${filteredStudents.length})`}
            </div>

            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border gap-3"
                style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}>
                <GraduationCap size={28} style={{ color: '#9B8E80', opacity: 0.4 }} />
                <p className="text-[#9B8E80] text-sm">
                  {students.length === 0 ? 'No enrolled students yet.' : 'No students match your search.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'rgba(180,165,148,0.22)' }}>
              <div className="min-w-[600px]">
                {/* Table header */}
                <div className="grid px-4 py-2.5"
                  style={{
                    gridTemplateColumns: '1.4fr 1.4fr 80px 80px 1fr',
                    background: 'rgba(180,165,148,0.06)',
                    borderBottom: '1px solid rgba(180,165,148,0.22)',
                  }}>
                  {['STUDENT', 'EMAIL', 'CURRENT', 'HIGHEST', 'COURSES'].map((h) => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#C4B8A8' }}>{h}</div>
                  ))}
                </div>

                {filteredStudents.map((s, i) => (
                  <div
                    key={s.student_id}
                    className="grid items-center px-4 py-3.5"
                    style={{
                      gridTemplateColumns: '1.4fr 1.4fr 80px 80px 1fr',
                      borderTop: i === 0 ? 'none' : '1px solid rgba(180,165,148,0.08)',
                      background: 'rgba(255,255,255,0.90)',
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(148,163,184,0.12)' }}>
                        <GraduationCap size={13} style={{ color: '#94a3b8' }} />
                      </div>
                      <span className="text-sm font-semibold text-[#1C1A17] truncate">{s.full_name}</span>
                    </div>
                    <span className="text-xs text-[#9B8E80] truncate pr-4">{s.email}</span>
                    <div>
                      {s.current_band !== null ? (
                        <span className="text-sm font-bold" style={{ color: bandColor(s.current_band) }}>
                          {s.current_band.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-[#C4B8A8]">—</span>
                      )}
                    </div>
                    <div>
                      {s.highest_band !== null ? (
                        <span className="text-sm font-bold" style={{ color: bandColor(s.highest_band) }}>
                          {s.highest_band.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-[#C4B8A8]">—</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {s.courses.length === 0 ? (
                        <span className="text-xs text-[#C4B8A8]">—</span>
                      ) : (
                        s.courses.map(c => (
                          <Link key={c.id} href={`/educator/courses/${c.id}`} className="no-underline">
                            <Badge variant="amber">{c.subject_code}</Badge>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
              </div>
            )}
          </div>

          {(filteredStudents.length > 0 || filteredPending.length > 0) && (
            <div className="flex items-center gap-2 text-xs text-[#C4B8A8]">
              <TrendingUp size={11} />
              {filteredStudents.length} enrolled · {filteredPending.length} pending
              {search && ` · filtered by "${search}"`}
            </div>
          )}
        </>
      )}
    </div>
  )
}
