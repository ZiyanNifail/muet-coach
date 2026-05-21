'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, getAuthHeaders } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, CalendarClock, Clock, BookOpen, Users, Mail, X } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Exam {
  id: string
  title: string
  scheduled_at: string | null
  exam_duration_mins: number | null
  created_at: string
}

interface ExamInvitation {
  id: string
  student_id: string
  status: 'pending' | 'accepted' | 'declined'
  users: { full_name: string; email: string }
}

interface Student {
  id: string
  full_name: string
  email: string
}

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [exam, setExam] = useState<Exam | null>(null)
  const [invitations, setInvitations] = useState<ExamInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [inviteSearch, setInviteSearch] = useState('')
  const [bulkInviting, setBulkInviting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      const authHdr = await getAuthHeaders()

      const [examRes, invRes] = await Promise.all([
        fetch(`${API_URL}/api/exams/${id}/detail`, { headers: authHdr }),
        fetch(`${API_URL}/api/exams/${id}/invitations`, { headers: authHdr }),
      ])

      if (examRes.ok) setExam((await examRes.json()).exam)
      else {
        // Fallback: fetch from standalone list
        const listRes = await fetch(`${API_URL}/api/exams`, { headers: authHdr })
        if (listRes.ok) {
          const list = (await listRes.json()).exams || []
          setExam(list.find((e: Exam) => e.id === id) || null)
        }
      }
      if (invRes.ok) setInvitations((await invRes.json()).invitations || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function openInviteModal() {
    setShowModal(true)
    setSelectedStudents(new Set())
    setInviteSearch('')
    const authHdr = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/courses/all-students`, { headers: authHdr })
    if (res.ok) setAllStudents((await res.json()).students || [])
  }

  function toggleStudent(studentId: string) {
    setSelectedStudents(prev => {
      const next = new Set(prev)
      next.has(studentId) ? next.delete(studentId) : next.add(studentId)
      return next
    })
  }

  async function handleBulkInvite() {
    if (!userId || selectedStudents.size === 0) return
    setBulkInviting(true)
    const authHdr = await getAuthHeaders()
    await Promise.all(
      Array.from(selectedStudents).map(studentId =>
        fetch(`${API_URL}/api/exams/${id}/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHdr },
          body: JSON.stringify({ student_id: studentId, educator_id: userId }),
        })
      )
    )
    const res = await fetch(`${API_URL}/api/exams/${id}/invitations`, { headers: authHdr })
    if (res.ok) setInvitations((await res.json()).invitations || [])
    setSelectedStudents(new Set())
    setBulkInviting(false)
    setShowModal(false)
  }

  if (loading) return <div className="p-6 text-[#9B8E80] text-sm">Loading...</div>
  if (!exam) return <div className="p-6 text-[#ef4444] text-sm">Exam not found.</div>

  const accepted = invitations.filter(i => i.status === 'accepted')
  const pending = invitations.filter(i => i.status === 'pending')

  return (
    <div className="p-6 max-w-2xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/educator/dashboard">
          <button className="mt-1 text-[#9B8E80] hover:text-[#6B6050] transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80', marginBottom: 2 }}>
            MUET MOCK EXAM
          </div>
          <h1 className="text-xl font-semibold text-[#1C1A17]">{exam.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-xs text-[#9B8E80]">
            {exam.scheduled_at && (
              <span className="flex items-center gap-1.5">
                <CalendarClock size={12} />
                {new Date(exam.scheduled_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
            {exam.exam_duration_mins && (
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                {exam.exam_duration_mins} min
              </span>
            )}
          </div>
        </div>
        <Button onClick={openInviteModal}>
          <Users size={14} className="mr-2" />
          Invite Students
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Invited', value: invitations.length, color: '#9B8E80' },
          { label: 'Accepted', value: accepted.length, color: '#22c55e' },
          { label: 'Pending', value: pending.length, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col gap-1 rounded-xl border p-4"
            style={{ background: 'rgba(255,255,255,0.90)', borderColor: 'rgba(180,165,148,0.22)' }}>
            <span className="text-2xl font-bold" style={{ color }}>{value}</span>
            <span className="text-xs text-[#9B8E80]">{label}</span>
          </div>
        ))}
      </div>

      {/* Invitations list */}
      {invitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80' }}>
            INVITATIONS ({invitations.length})
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(180,165,148,0.22)' }}>
            {invitations.map((inv, i) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: 'rgba(255,255,255,0.90)',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(180,165,148,0.10)',
                }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1C1A17]">{inv.users?.full_name}</div>
                  <div className="text-xs text-[#9B8E80] flex items-center gap-1">
                    <Mail size={10} />{inv.users?.email}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold"
                  style={{
                    background: inv.status === 'accepted' ? 'rgba(34,197,94,0.12)'
                      : inv.status === 'declined' ? 'rgba(239,68,68,0.10)'
                      : 'rgba(180,165,148,0.12)',
                    color: inv.status === 'accepted' ? '#16a34a'
                      : inv.status === 'declined' ? '#ef4444'
                      : '#9B8E80',
                  }}>
                  {inv.status === 'accepted' ? '✓ Accepted' : inv.status === 'declined' ? 'Declined' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {invitations.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 rounded-xl border gap-3"
          style={{ borderColor: 'rgba(180,165,148,0.18)' }}>
          <Users size={24} style={{ color: '#C4B8A8' }} />
          <p className="text-sm text-[#9B8E80]">No students invited yet.</p>
          <Button variant="secondary" onClick={openInviteModal}>
            <Users size={13} className="mr-2" /> Invite Students
          </Button>
        </div>
      )}

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowModal(false)}>
          <div className="rounded-2xl border p-6 w-full max-w-lg flex flex-col gap-4"
            style={{ background: '#FAFAF8', borderColor: 'rgba(180,165,148,0.35)', boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B8E80' }}>INVITE STUDENTS</div>
                <h2 className="text-base font-semibold text-[#1C1A17] mt-0.5">{exam.title}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#9B8E80] hover:text-[#1C1A17] transition-colors">
                <X size={18} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Search by name or email..."
              value={inviteSearch}
              onChange={e => setInviteSearch(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-[#C4B8A8] text-[#1C1A17]"
              style={{ background: 'rgba(180,165,148,0.08)', borderColor: 'rgba(180,165,148,0.30)' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.35)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(180,165,148,0.30)')}
            />

            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {allStudents.length === 0 ? (
                <p className="text-xs text-[#9B8E80] text-center py-6">Loading students...</p>
              ) : (() => {
                const q = inviteSearch.toLowerCase()
                const filtered = allStudents.filter(s =>
                  s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
                )
                if (filtered.length === 0) return <p className="text-xs text-[#9B8E80] text-center py-6">No students found.</p>
                return filtered.map(s => {
                  const existing = invitations.find(i => i.student_id === s.id)
                  const checked = selectedStudents.has(s.id)
                  return (
                    <label key={s.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors"
                      style={{
                        background: checked ? 'rgba(139,92,246,0.06)' : 'rgba(180,165,148,0.04)',
                        borderColor: checked ? 'rgba(139,92,246,0.25)' : 'rgba(180,165,148,0.18)',
                      }}>
                      <input type="checkbox" checked={checked} disabled={!!existing}
                        onChange={() => !existing && toggleStudent(s.id)}
                        className="rounded accent-violet-500"
                        style={{ width: 14, height: 14, flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#1C1A17] font-medium truncate">{s.full_name}</div>
                        <div className="text-xs text-[#9B8E80] flex items-center gap-1">
                          <Mail size={10} />{s.email}
                        </div>
                      </div>
                      {existing && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold flex-shrink-0"
                          style={{
                            background: existing.status === 'accepted' ? 'rgba(34,197,94,0.12)' : 'rgba(180,165,148,0.12)',
                            color: existing.status === 'accepted' ? '#16a34a' : '#9B8E80',
                          }}>
                          {existing.status === 'accepted' ? '✓ Accepted' : existing.status === 'declined' ? 'Declined' : 'Invited'}
                        </span>
                      )}
                    </label>
                  )
                })
              })()}
            </div>

            <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(180,165,148,0.18)' }}>
              <p className="text-[11px] text-[#9B8E80]">
                {selectedStudents.size > 0 ? `${selectedStudents.size} student${selectedStudents.size !== 1 ? 's' : ''} selected` : 'Select students to invite'}
              </p>
              <Button onClick={handleBulkInvite} disabled={bulkInviting || selectedStudents.size === 0}>
                {bulkInviting ? 'Inviting...' : `Invite Selected (${selectedStudents.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
