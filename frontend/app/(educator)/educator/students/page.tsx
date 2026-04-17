'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { GraduationCap, BookOpen, ChevronRight, TrendingUp, ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react'

interface MemberRow {
  member_id: string
  student_id: string
  full_name: string
  email: string
  course_id: string
  course_name: string
  subject_code: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function StudentsPage() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const tokenRef = useRef<string>('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const authHdr = await getAuthHeaders()
      const session = (await supabase.auth.getSession()).data.session
      tokenRef.current = session?.access_token ?? ''

      try {
        const coursesRes = await fetch(`${API_URL}/api/courses?educator_id=${user.id}`, { headers: authHdr })
        if (!coursesRes.ok) { setLoading(false); return }
        const courses = (await coursesRes.json()).courses || []

        const rows: MemberRow[] = []
        await Promise.all(
          courses.map(async (c: { id: string; name: string; subject_code: string }) => {
            const res = await fetch(`${API_URL}/api/courses/${c.id}/members`, { headers: authHdr })
            if (!res.ok) return
            const mems = (await res.json()).members || []
            for (const m of mems) {
              if (m.status === 'rejected') continue
              rows.push({
                member_id: m.id,
                student_id: m.student_id,
                full_name: m.users?.full_name || '—',
                email: m.users?.email || '—',
                course_id: c.id,
                course_name: c.name,
                subject_code: c.subject_code,
                status: m.status,
                requested_at: m.requested_at,
              })
            }
          })
        )
        rows.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1
          if (a.status !== 'pending' && b.status === 'pending') return 1
          return a.full_name.localeCompare(b.full_name)
        })
        setMembers(rows)
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
      if (action === 'reject') {
        setMembers((prev) => prev.filter((m) => m.member_id !== memberId))
      } else {
        setMembers((prev) => prev.map((m) => m.member_id === memberId ? { ...m, status: 'approved' } : m))
      }
    }
    setActionId(null)
  }

  const searchLower = search.trim().toLowerCase()
  const filtered = searchLower
    ? members.filter((m) =>
        m.full_name.toLowerCase().includes(searchLower) ||
        m.email.toLowerCase().includes(searchLower),
      )
    : members

  const pending = filtered.filter((m) => m.status === 'pending')
  const approved = filtered.filter((m) => m.status === 'approved')

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
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
            <p className="text-[#6B6050] text-sm mt-1">Manage join requests and enrolled students across your courses.</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border px-3.5 py-2 text-sm outline-none placeholder:text-[#C4B8A8]"
          style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)', color: '#1C1A17', width: 260 }}
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
          {pending.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f59e0b' }}>
                  PENDING REQUESTS
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: '#fff' }}>
                  {pending.length}
                </span>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(245,158,11,0.20)' }}>
                {pending.map((m, i) => (
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
                        className="rounded-lg p-1.5 transition-colors"
                        style={{ color: '#22c55e', background: 'rgba(34,197,94,0.08)' }}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => handleAction(m.member_id, m.course_id, 'reject')}
                        disabled={actionId === m.member_id}
                        title="Reject"
                        className="rounded-lg p-1.5 transition-colors"
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

          {/* Enrolled students */}
          <div className="flex flex-col gap-3">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80' }}>
              ENROLLED STUDENTS {approved.length > 0 && `(${approved.length})`}
            </div>

            {approved.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border gap-3"
                style={{ background: 'rgba(255,255,255,0.80)', borderColor: 'rgba(180,165,148,0.22)' }}>
                <GraduationCap size={28} style={{ color: '#9B8E80', opacity: 0.4 }} />
                <p className="text-[#9B8E80] text-sm">
                  {members.length === 0 ? 'No students yet. Share your course invite codes to get started.' : 'No approved students match your search.'}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(180,165,148,0.22)' }}>
                {/* Table header */}
                <div className="grid px-4 py-2.5"
                  style={{
                    gridTemplateColumns: '1fr 1fr 1fr auto',
                    background: 'rgba(180,165,148,0.06)',
                    borderBottom: '1px solid rgba(180,165,148,0.22)',
                  }}>
                  {['STUDENT', 'EMAIL', 'COURSE', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#C4B8A8' }}>{h}</div>
                  ))}
                </div>

                {approved.map((m, i) => (
                  <Link key={`${m.student_id}-${m.course_id}`} href={`/educator/courses/${m.course_id}`} className="no-underline">
                    <div
                      className="grid items-center px-4 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      style={{
                        gridTemplateColumns: '1fr 1fr 1fr auto',
                        borderTop: i === 0 ? 'none' : '1px solid rgba(180,165,148,0.08)',
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(148,163,184,0.12)' }}>
                          <GraduationCap size={13} style={{ color: '#94a3b8' }} />
                        </div>
                        <span className="text-sm font-semibold text-[#1C1A17] truncate">{m.full_name}</span>
                      </div>
                      <span className="text-xs text-[#9B8E80] truncate pr-4">{m.email}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        <span className="text-xs font-mono text-[#f59e0b]">{m.subject_code}</span>
                        <span className="text-xs text-[#9B8E80] truncate hidden sm:block">{m.course_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="green">Enrolled</Badge>
                        <ChevronRight size={13} style={{ color: '#C4B8A8' }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {(pending.length > 0 || approved.length > 0) && (
            <div className="flex items-center gap-2 text-xs text-[#C4B8A8]">
              <TrendingUp size={11} />
              {approved.length} enrolled · {pending.length} pending
              {search && ` · filtered by "${search}"`}
            </div>
          )}
        </>
      )}
    </div>
  )
}
